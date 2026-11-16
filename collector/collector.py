"""
StockBriefing All-Market Collector
==================================
Collects:
  1. Global SEC EDGAR real-time Form 8-K filings (with S&P 500 / Nasdaq priority & CIK->Ticker resolution)
  2. Official corporate Press Releases & PR Newswire feeds
  3. Public Financial News RSS headlines & summaries (Yahoo Finance, CNBC, MarketWatch)

Strict Rules Enforced:
  - Zero image/thumbnail scraping (no <img>, no og:image, text & metadata only)
  - Database write via SUPABASE_SERVICE_ROLE_KEY
  - Official `google-genai` SDK (`from google import genai`) + `gemini-2.5-flash` + Pydantic `response_schema`
  - Per-feed & per-entry `try-except` fault isolation
"""

from __future__ import annotations

import calendar
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Literal
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import feedparser
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from requests.adapters import HTTPAdapter
from supabase import Client, create_client
from urllib3.util.retry import Retry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("StockBriefingCollector")

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

ACCESSION_REGEX = re.compile(r"(\d{10}-\d{2}-\d{6})")
CIK_IN_TITLE_REGEX = re.compile(r"\((\d{10})\)")
SEC_FILER_TITLE_REGEX = re.compile(r"^[^-]+-\s*(.+?)\s*\(\d{10}\)")
TICKER_CLEAN_REGEX = re.compile(r"^[A-Z]{1,5}(?:-[A-Z])?$")

SEC_BASE_URL = "https://www.sec.gov"
SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
DEFAULT_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


# ============================================================================
# 1. Pydantic Output Schema for Gemini 2.5 Flash Structured Output
# ============================================================================
class FilingAISummary(BaseModel):
    headline_kr: str = Field(
        description="투자자 시선을 끄는 직관적이고 명확한 한글 한 줄 헤드라인 (이모지 제외)"
    )
    sentiment: Literal["Bullish", "Bearish", "Neutral"] = Field(
        description="주가 및 시장 영향도 판정: 'Bullish'(호재), 'Bearish'(악재), 'Neutral'(중립) 중 택1"
    )
    summary_lines: list[str] = Field(
        description="핵심 팩트 중심 3줄 요약 (개조식 한글, 정확히 3개 항목)"
    )
    key_numbers: list[str] = Field(
        description="본문에 등장한 주요 재무 수치, 지수 변동폭, 계약 규모, 일정 등 추출 (없으면 빈 배열)"
    )
    detected_ticker: str = Field(
        description="문서의 핵심 미국 상장사 티커 심볼 대문자 1개 (예: 'NVDA', 'LLY', 'JPM'). 특정 개별 종목이 아닌 거시경제/시황 뉴스면 'MARKET'"
    )
    detected_company: str = Field(
        description="핵심 기업명 또는 출처명 (예: 'Eli Lilly', 'JPMorgan Chase', 'US Market')"
    )


SYSTEM_INSTRUCTION = """당신은 월스트리트 출신의 시니어 애널리스트이자 금융 번역 전문가입니다.
미국 상장사의 SEC EDGAR 공시(8-K, Form 4 내부자거래 등), 기업 공식 보도자료, 글로벌 금융 뉴스 RSS를 분석하여 한국 투자자를 위한 핵심 브리핑을 작성합니다.

반드시 다음 원칙을 지키세요:
1. 원문에 없는 사실을 추측하거나 과장하지 마세요 (100% 팩트 기반).
2. `headline_kr`: 기업명(가능하면 한글명 병기, 예: 'Eli Lilly(일라이 릴리)')을 포함해 투자자가 1초 만에 핵심을 파악할 수 있는 한글 1줄 헤드라인으로 작성하세요.
3. `sentiment`: 실적 서프라이즈·수주·승인·내부자 장내매수·금리인하 기대 등은 'Bullish', 가이던스 하향·규제/소송·대규모 내부자 매도·긴축 우려 등은 'Bearish', 단순 인사·정기 절차·세금납부용 주식처분·혼조세는 'Neutral'로 분류하세요.
4. `summary_lines`: 반드시 3개의 개조식 한글 문장(예: "~발표", "~기록", "~전망")으로 초보 투자자도 쉽게 이해할 수 있게 요약하세요.
5. `key_numbers`: "$12.4B 매출", "EPS $2.15", "실적발표(Item 2.02)", "주요계약(Item 1.01)", "내부자 매수(Form 4)" 등 공시 항목은 반드시 쉬운 한글 설명을 함께 적어 최대 5개 추출하세요.
6. `detected_ticker`: 본문 주체가 특정 미국 상장사면 공식 티커(예: AAPL, LLY, JPM, AMD)를 적고, 전반적 증시/거시경제 뉴스면 반드시 'MARKET'을 반환하세요.
"""


# ============================================================================
# 2. HTTP Session & SEC EDGAR Anti-Blocking Helpers
# ============================================================================
def create_http_session() -> requests.Session:
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.8,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_url_with_retry(
    session: requests.Session,
    url: str,
    is_sec: bool,
    sec_user_agent: str,
    timeout: int = 20,
) -> requests.Response | None:
    headers: dict[str, str] = {
        "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    }
    if is_sec or "sec.gov" in url:
        headers["User-Agent"] = sec_user_agent
        time.sleep(0.2)  # Mandatory SEC rate-limit guard (< 10 req/sec)
    else:
        headers["User-Agent"] = DEFAULT_BROWSER_UA

    for attempt in range(1, 4):
        try:
            resp = session.get(url, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (403, 429):
                wait_sec = 1.5 * attempt
                logger.warning(
                    "HTTP %s on %s (attempt %d/3). Backing off %.1fs...",
                    resp.status_code,
                    url,
                    attempt,
                    wait_sec,
                )
                time.sleep(wait_sec)
                continue
            logger.warning("HTTP %s returned for URL: %s", resp.status_code, url)
            return None
        except requests.RequestException as exc:
            wait_sec = 1.0 * attempt
            logger.warning(
                "Request error on %s (attempt %d/3): %s", url, attempt, exc
            )
            time.sleep(wait_sec)

    return None


def load_sec_cik_ticker_map(
    session: requests.Session, sec_user_agent: str
) -> dict[str, tuple[str, str]]:
    """
    Loads SEC's official `company_tickers.json` mapping 10-digit CIK -> (TICKER, Company Title).
    Allows accurate ticker tagging for any US-listed public company on the global SEC feed.
    """
    cik_map: dict[str, tuple[str, str]] = {}
    try:
        resp = fetch_url_with_retry(
            session=session,
            url=SEC_COMPANY_TICKERS_URL,
            is_sec=True,
            sec_user_agent=sec_user_agent,
        )
        if not resp:
            return cik_map
        data = resp.json()
        for item in data.values():
            cik_10 = str(item.get("cik_str", "")).zfill(10)
            ticker = str(item.get("ticker", "")).strip().upper()
            title = str(item.get("title", "")).strip()
            if cik_10 and ticker:
                cik_map[cik_10] = (ticker, title)
        logger.info("Loaded %d SEC CIK->Ticker mappings.", len(cik_map))
    except Exception as exc:
        logger.warning("Could not load SEC company_tickers.json (continuing safely): %s", exc)
    return cik_map


# ============================================================================
# 3. Feed Parsing, Deduplication ID & Clean Text Extraction (Zero Images!)
# ============================================================================
def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    filtered_query = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if not k.lower().startswith(("utm_", "fbclid", "gclid", "mc_", "ncid"))
    ]
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            urlencode(filtered_query),
            "",
        )
    )


def extract_unique_id(entry: Any, source_type: str) -> str:
    raw_id = str(entry.get("id", "") or "")
    raw_link = str(entry.get("link", "") or "")

    if source_type == "SEC":
        for candidate in (raw_id, raw_link, str(entry.get("summary", ""))):
            match = ACCESSION_REGEX.search(candidate)
            if match:
                return match.group(1)
        return raw_id or normalize_url(raw_link)

    return normalize_url(raw_link) if raw_link else raw_id


def parse_published_at(entry: Any) -> str:
    for struct_key in ("published_parsed", "updated_parsed"):
        parsed_struct = entry.get(struct_key)
        if parsed_struct:
            try:
                ts = calendar.timegm(parsed_struct)
                return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            except (ValueError, OverflowError, TypeError):
                pass

    for str_key in ("published", "updated"):
        raw_date = entry.get(str_key)
        if raw_date:
            try:
                dt = parsedate_to_datetime(str(raw_date))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except (ValueError, TypeError):
                try:
                    dt = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt.astimezone(timezone.utc).isoformat()
                except ValueError:
                    pass

    return datetime.now(timezone.utc).isoformat()


def clean_html_to_text(html_content: str, max_chars: int = 15000) -> str:
    """
    Rule #1 Enforcement:
    Strips <script>, <style>, <nav>, <footer>, and ALL image/media/meta tags
    (zero <img>, zero og:image), returning pure text truncated to `max_chars`.
    """
    if not html_content:
        return ""

    soup = BeautifulSoup(html_content, "html.parser")
    for tag in soup(
        [
            "script",
            "style",
            "nav",
            "footer",
            "noscript",
            "meta",
            "link",
            "figure",
            "svg",
            "img",
            "picture",
            "video",
            "audio",
            "iframe",
            "canvas",
            "object",
            "embed",
        ]
    ):
        tag.decompose()

    raw_text = soup.get_text(separator="\n", strip=True)
    cleaned_lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in raw_text.splitlines()
        if line.strip()
    ]
    return "\n".join(cleaned_lines)[:max_chars]


def extract_sec_filing_text(
    session: requests.Session,
    index_url: str,
    fallback_summary: str,
    sec_user_agent: str,
    max_chars: int = 15000,
) -> str:
    resp = fetch_url_with_retry(
        session=session,
        url=index_url,
        is_sec=True,
        sec_user_agent=sec_user_agent,
    )
    if not resp:
        return clean_html_to_text(fallback_summary, max_chars=max_chars)

    soup = BeautifulSoup(resp.text, "html.parser")
    index_text = clean_html_to_text(resp.text, max_chars=3000)

    doc_urls: list[str] = []
    table = soup.find("table", class_="tableFile")
    if table:
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 4:
                continue
            doc_type = cells[3].get_text(strip=True).upper()
            link_tag = cells[2].find("a", href=True)
            if not link_tag:
                continue

            href = link_tag["href"]
            if "/ix?doc=" in href:
                href = href.split("/ix?doc=", 1)[1]
            # Strip XSLT rendering prefix on Form 4 XML (e.g. /xslF345X05/form4.xml -> raw XML/HTML)
            href = re.sub(r"/xsl[A-Za-z0-9_]+/", "/", href)
            if not href.lower().endswith((".htm", ".html", ".txt", ".xml")):
                continue

            full_doc_url = urljoin(SEC_BASE_URL, href)
            if (
                doc_type.startswith("8-K")
                or doc_type.startswith("EX-99")
                or doc_type in ("4", "4/A", "FORM 4")
                or doc_type.startswith(("SC 13", "SCHEDULE 13", "13F", "10-K", "10-Q", "S-1", "144", "6-K", "NT 10", "DEF 14"))
            ):
                doc_urls.append(full_doc_url)

    collected_parts: list[str] = [index_text] if index_text else []
    for doc_url in doc_urls[:2]:
        doc_resp = fetch_url_with_retry(
            session=session,
            url=doc_url,
            is_sec=True,
            sec_user_agent=sec_user_agent,
        )
        if doc_resp:
            doc_text = clean_html_to_text(doc_resp.text, max_chars=max_chars)
            if doc_text:
                collected_parts.append(doc_text)
        if sum(len(p) for p in collected_parts) >= max_chars:
            break

    combined = "\n\n---\n\n".join(collected_parts).strip()
    if not combined:
        return clean_html_to_text(fallback_summary, max_chars=max_chars)
    return combined[:max_chars]


def extract_press_release_text(
    session: requests.Session,
    article_url: str,
    rss_fallback_html: str,
    sec_user_agent: str,
    max_chars: int = 15000,
) -> str:
    rss_text = clean_html_to_text(rss_fallback_html, max_chars=max_chars)
    resp = fetch_url_with_retry(
        session=session,
        url=article_url,
        is_sec=False,
        sec_user_agent=sec_user_agent,
    )
    if not resp:
        return rss_text[:max_chars]

    page_text = clean_html_to_text(resp.text, max_chars=max_chars)
    if len(page_text) < len(rss_text):
        return f"{rss_text}\n\n{page_text}".strip()[:max_chars]
    return page_text[:max_chars]


# ============================================================================
# 4. Supabase Deduplication
# ============================================================================
def is_already_collected(supabase: Client, unique_id: str) -> bool:
    result = (
        supabase.table("filings_feed")
        .select("unique_id")
        .eq("unique_id", unique_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


# ============================================================================
# 5. Gemini 2.5 Flash AI Summarizer (`google-genai` SDK)
# ============================================================================
GEMINI_MODEL_CANDIDATES: list[str] = [
    m.strip()
    for m in os.environ.get(
        "GEMINI_MODEL_CANDIDATES",
        "gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.5-flash-lite",
    ).split(",")
    if m.strip()
]
_active_gemini_model: str = GEMINI_MODEL_CANDIDATES[0]


def summarize_with_gemini(
    gemini_client: genai.Client,
    ticker_hint: str,
    company_hint: str,
    source_type: str,
    filing_type: str,
    original_title: str,
    body_text: str,
) -> FilingAISummary | None:
    global _active_gemini_model
    user_prompt = (
        f"[기본 출처/종목 힌트] {company_hint} ({ticker_hint})\n"
        f"[문서 유형] {source_type} - {filing_type}\n"
        f"[원문 제목] {original_title}\n\n"
        f"[원문 텍스트 (최대 15,000자)]\n{body_text}\n"
    )

    ordered_models = [_active_gemini_model] + [
        m for m in GEMINI_MODEL_CANDIDATES if m != _active_gemini_model
    ]

    for model_name in ordered_models:
        for attempt in range(1, 3):
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=FilingAISummary,
                        temperature=0.2,
                    ),
                )
                if not response.text:
                    break

                parsed = FilingAISummary.model_validate_json(response.text)
                cleaned_lines = [
                    line.strip() for line in parsed.summary_lines if line.strip()
                ][:3]
                if cleaned_lines:
                    parsed.summary_lines = cleaned_lines
                _active_gemini_model = model_name
                return parsed

            except Exception as exc:
                err_msg = str(exc)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    wait_sec = 5.0 * attempt
                    logger.warning(
                        "Gemini rate limit on %s (attempt %d/2). Sleeping %.1fs...",
                        model_name,
                        attempt,
                        wait_sec,
                    )
                    time.sleep(wait_sec)
                    continue
                if "404" in err_msg or "NOT_FOUND" in err_msg or "503" in err_msg or "UNAVAILABLE" in err_msg:
                    logger.warning(
                        "Model %s unavailable (%s); trying next fallback model...",
                        model_name,
                        err_msg[:120],
                    )
                    break
                logger.error(
                    "Gemini summarization failed on %s for '%s': %s",
                    model_name,
                    original_title,
                    exc,
                )
                break

    return None


# ============================================================================
# 6. Main Collector Pipeline (with Per-Feed & Per-Entry Fault Isolation)
# ============================================================================
def load_env_or_exit() -> tuple[str, str, str, str]:
    required_keys = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
        "SEC_USER_AGENT",
    ]
    missing = [k for k in required_keys if not os.environ.get(k)]
    if missing:
        logger.error(
            "Missing required environment variables: %s", ", ".join(missing)
        )
        sys.exit(1)

    return (
        os.environ["SUPABASE_URL"].strip(),
        os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip(),
        os.environ["GEMINI_API_KEY"].strip(),
        os.environ["SEC_USER_AGENT"].strip(),
    )


def resolve_global_sec_filer(
    entry_title: str, cik_map: dict[str, tuple[str, str]]
) -> tuple[str | None, str | None]:
    """Resolves (ticker, company_name) from SEC global feed entry title using CIK."""
    cik_match = CIK_IN_TITLE_REGEX.search(entry_title)
    if not cik_match:
        return None, None

    cik_10 = cik_match.group(1)
    if cik_10 in cik_map:
        return cik_map[cik_10]

    name_match = SEC_FILER_TITLE_REGEX.search(entry_title)
    fallback_name = name_match.group(1).strip() if name_match else f"CIK {cik_10}"
    return None, fallback_name


def run_collector() -> None:
    supabase_url, supabase_key, gemini_api_key, sec_user_agent = load_env_or_exit()

    config_path = BASE_DIR / "feeds_config.json"
    with config_path.open("r", encoding="utf-8") as f:
        config = json.load(f)

    max_items_per_feed: int = int(config.get("max_items_per_feed", 6))
    max_global_sec_items: int = int(config.get("max_global_sec_items", 15))
    max_unprioritized_sec: int = int(config.get("max_unprioritized_sec_per_run", 3))
    max_text_chars: int = int(config.get("max_text_chars", 15000))
    priority_tickers: set[str] = {
        str(t).upper() for t in config.get("priority_tickers", [])
    }
    feeds: list[dict[str, Any]] = config.get("feeds", [])

    supabase: Client = create_client(supabase_url, supabase_key)
    gemini_client = genai.Client(
        api_key=gemini_api_key,
        http_options=types.HttpOptions(timeout=25000),
    )
    session = create_http_session()

    cik_map = load_sec_cik_ticker_map(session=session, sec_user_agent=sec_user_agent)

    stats = {"checked": 0, "skipped_duplicate": 0, "inserted": 0, "failed": 0}
    run_started_at = time.monotonic()
    max_runtime_sec = int(os.environ.get("COLLECTOR_MAX_RUNTIME_SEC", "330"))
    logger.info("Starting all-market collection across %d feeds...", len(feeds))

    for feed_cfg in feeds:
        if time.monotonic() - run_started_at >= max_runtime_sec:
            logger.info("Reached graceful runtime budget (%ds). Exiting cleanly.", max_runtime_sec)
            break
        default_ticker = str(feed_cfg.get("ticker", "MARKET")).upper()
        default_company = str(feed_cfg.get("company_name", "Market"))
        source_type = str(feed_cfg.get("source_type", "NEWS")).upper()
        filing_type = str(feed_cfg.get("filing_type", "News"))
        is_global_sec = bool(feed_cfg.get("is_global_sec", False))
        is_sec_efts = bool(feed_cfg.get("is_sec_efts", False))
        priority_only = bool(feed_cfg.get("priority_only", False))
        feed_url = str(feed_cfg.get("url", ""))
        is_sec = source_type == "SEC"

        # Rule #4: Per-feed fault isolation
        try:
            if not feed_url:
                continue

            logger.info("[%s | %s] Fetching feed: %s", default_company, source_type, feed_url)
            resp = fetch_url_with_retry(
                session=session,
                url=feed_url,
                is_sec=is_sec,
                sec_user_agent=sec_user_agent,
            )
            if not resp:
                logger.error(
                    "[%s | %s] Feed timeout/error on %s. Moving to next feed.",
                    default_company,
                    source_type,
                    feed_url,
                )
                stats["failed"] += 1
                continue

            if is_sec_efts:
                prioritized_entries: list[tuple[Any, str, str, bool]] = []
                general_entries: list[tuple[Any, str, str, bool]] = []
                hits = (resp.json().get("hits") or {}).get("hits") or []
                seen_adsh: set[str] = set()
                for hit in hits:
                    src = hit.get("_source") or {}
                    adsh = str(src.get("adsh") or "").strip()
                    if not adsh or adsh in seen_adsh:
                        continue
                    ciks = src.get("ciks") or []
                    disp_names = src.get("display_names") or []
                    form_code = str(src.get("form") or filing_type).strip()
                    file_date = str(src.get("file_date") or "").strip()

                    resolved_ticker: str | None = None
                    resolved_company: str | None = None

                    for dn in disp_names:
                        dn_str = str(dn)
                        cik_m = re.search(r"CIK\s*(\d{10})", dn_str)
                        if cik_m and cik_m.group(1) in cik_map:
                            resolved_ticker, resolved_company = cik_map[cik_m.group(1)]
                            break
                        tk_m = re.search(r"\(([A-Z]{1,5}(?:-[A-Z])?)\)\s*\(CIK", dn_str)
                        if tk_m:
                            resolved_ticker = tk_m.group(1).upper()
                            resolved_company = dn_str.split("(")[0].strip()
                            break

                    if not resolved_ticker:
                        for c_raw in ciks:
                            c10 = str(c_raw).zfill(10)
                            if c10 in cik_map:
                                resolved_ticker, resolved_company = cik_map[c10]
                                break

                    if not resolved_ticker:
                        continue

                    seen_adsh.add(adsh)
                    primary_cik_int = int(str(ciks[0])) if ciks else 0
                    adsh_nodash = adsh.replace("-", "")
                    index_link = f"https://www.sec.gov/Archives/edgar/data/{primary_cik_int}/{adsh_nodash}/{adsh}-index.htm"
                    disp_joined = " | ".join(str(x) for x in disp_names)
                    synth_entry = {
                        "id": adsh,
                        "link": index_link,
                        "title": f"{form_code} - {disp_joined}",
                        "published": f"{file_date}T12:00:00Z" if file_date else "",
                        "summary": f"SEC {form_code} Filing ({disp_joined}) - File Date: {file_date}",
                    }
                    if resolved_ticker in priority_tickers:
                        prioritized_entries.append(
                            (synth_entry, resolved_ticker, resolved_company or resolved_ticker, True)
                        )
                    else:
                        general_entries.append(
                            (synth_entry, resolved_ticker, resolved_company or resolved_ticker, False)
                        )

                extra_general = [] if priority_only else general_entries[:max_unprioritized_sec]
                selected_tuples = (
                    prioritized_entries[:max_global_sec_items] + extra_general
                )[:max_global_sec_items]
            elif is_global_sec:
                parsed_feed = feedparser.parse(resp.content)
                raw_entries = parsed_feed.entries
                prioritized_entries = []
                general_entries = []

                for entry in raw_entries:
                    entry_title = str(entry.get("title", "") or "")
                    # For Schedule 13D/13G, the public company is marked (Subject) while the activist is (Filed by)
                    if "13D" in filing_type.upper() or "13G" in filing_type.upper():
                        if "(Filed by)" in entry_title or "(Reporting)" in entry_title:
                            continue
                    else:
                        # Skip duplicate non-filer rows in SEC `getcurrent` feed (keep Filer/Issuer)
                        if "(Subject)" in entry_title or "(Reporting)" in entry_title:
                            continue
                    resolved_ticker, resolved_company = resolve_global_sec_filer(
                        entry_title, cik_map
                    )
                    if not resolved_ticker:
                        if filing_type.upper() in ("13F-HR", "S-1") and resolved_company:
                            general_entries.append(
                                (entry, "MARKET", resolved_company, False)
                            )
                        # Skip non-exchange-listed shell/trust CIKs to protect LLM quota
                        continue
                    if resolved_ticker in priority_tickers:
                        prioritized_entries.append(
                            (entry, resolved_ticker, resolved_company or resolved_ticker, True)
                        )
                    else:
                        general_entries.append(
                            (entry, resolved_ticker, resolved_company or resolved_ticker, False)
                        )

                extra_general = [] if priority_only else general_entries[:max_unprioritized_sec]
                selected_tuples = (
                    prioritized_entries[:max_global_sec_items] + extra_general
                )[:max_global_sec_items]
            else:
                parsed_feed = feedparser.parse(resp.content)
                raw_entries = parsed_feed.entries
                selected_tuples = [
                    (e, default_ticker, default_company, True)
                    for e in raw_entries[:max_items_per_feed]
                ]

            for entry, entry_ticker, entry_company, _ in selected_tuples:
                if time.monotonic() - run_started_at >= max_runtime_sec:
                    logger.info("Reached graceful runtime budget (%ds) inside feed loop. Exiting cleanly.", max_runtime_sec)
                    return
                try:
                    stats["checked"] += 1
                    source_url = str(entry.get("link", "") or "").strip()
                    if not source_url:
                        continue

                    unique_id = extract_unique_id(entry, source_type=source_type)
                    if not unique_id:
                        continue

                    # STEP A: Deduplicate in Supabase BEFORE fetching HTML or calling Gemini
                    if is_already_collected(supabase, unique_id):
                        stats["skipped_duplicate"] += 1
                        continue

                    original_title = str(
                        entry.get("title", "") or f"{entry_company} {filing_type}"
                    ).strip()
                    published_at = parse_published_at(entry)

                    rss_fallback = ""
                    if entry.get("content") and isinstance(entry.content, list):
                        rss_fallback = str(entry.content[0].get("value", ""))
                    elif entry.get("summary"):
                        rss_fallback = str(entry.get("summary", ""))
                    elif entry.get("description"):
                        rss_fallback = str(entry.get("description", ""))

                    # STEP B: Extract pure text (Zero images, max 15,000 chars)
                    if is_sec:
                        body_text = extract_sec_filing_text(
                            session=session,
                            index_url=source_url,
                            fallback_summary=rss_fallback,
                            sec_user_agent=sec_user_agent,
                            max_chars=max_text_chars,
                        )
                    elif source_type == "NEWS":
                        # Public news RSS: summarize strictly from RSS headline & summary metadata
                        rss_clean = clean_html_to_text(rss_fallback, max_text_chars)
                        body_text = f"Headline: {original_title}\nSummary: {rss_clean}".strip()
                    else:
                        body_text = extract_press_release_text(
                            session=session,
                            article_url=source_url,
                            rss_fallback_html=rss_fallback,
                            sec_user_agent=sec_user_agent,
                            max_chars=max_text_chars,
                        )

                    if not body_text or len(body_text.strip()) < 20:
                        body_text = f"Title: {original_title}\n{clean_html_to_text(rss_fallback, max_text_chars)}"

                    # STEP C: Gemini 2.5 Flash Structured Summary & Ticker Detection
                    ai_summary = summarize_with_gemini(
                        gemini_client=gemini_client,
                        ticker_hint=entry_ticker,
                        company_hint=entry_company,
                        source_type=source_type,
                        filing_type=filing_type,
                        original_title=original_title,
                        body_text=body_text[:max_text_chars],
                    )
                    if not ai_summary:
                        stats["failed"] += 1
                        continue

                    # Resolve final ticker & company name
                    final_ticker = entry_ticker
                    final_company = entry_company
                    if final_ticker in ("MARKET", "ALL"):
                        candidate = ai_summary.detected_ticker.strip().upper().lstrip("$")
                        if candidate == "MARKET" or TICKER_CLEAN_REGEX.match(candidate):
                            final_ticker = candidate
                        else:
                            final_ticker = "MARKET"
                        if ai_summary.detected_company.strip() and final_ticker != "MARKET":
                            final_company = (
                                f"{ai_summary.detected_company.strip()} · {default_company}"
                            )

                    payload = {
                        "unique_id": unique_id,
                        "ticker": final_ticker,
                        "company_name": final_company,
                        "source_type": source_type,
                        "filing_type": filing_type,
                        "original_title": original_title,
                        "headline_kr": ai_summary.headline_kr,
                        "sentiment": ai_summary.sentiment,
                        "summary_lines": ai_summary.summary_lines,
                        "key_numbers": ai_summary.key_numbers,
                        "source_url": source_url,
                        "published_at": published_at,
                    }

                    supabase.table("filings_feed").insert(payload).execute()
                    stats["inserted"] += 1
                    logger.info(
                        "[%s | %s] Inserted [%s] %s",
                        final_ticker,
                        source_type,
                        ai_summary.sentiment,
                        ai_summary.headline_kr,
                    )
                    if stats["inserted"] >= int(config.get("max_inserts_per_run", 10)):
                        logger.info(
                            "Reached per-run insert cap (%d). Remaining feeds will continue on next 10-min cycle.",
                            stats["inserted"],
                        )
                        logger.info(
                            "All-market collection finished | Checked: %d | Skipped(Dup): %d | Inserted: %d | Failed: %d",
                            stats["checked"],
                            stats["skipped_duplicate"],
                            stats["inserted"],
                            stats["failed"],
                        )
                        return
                    time.sleep(0.6)

                except Exception as entry_exc:
                    logger.error(
                        "[%s | %s] Error processing entry: %s",
                        default_company,
                        source_type,
                        entry_exc,
                    )
                    stats["failed"] += 1
                    continue

        except Exception as feed_exc:
            logger.error(
                "[%s | %s] Unexpected feed failure (%s): %s. Continuing to next feed.",
                default_company,
                source_type,
                feed_url,
                feed_exc,
            )
            stats["failed"] += 1
            continue

    logger.info(
        "All-market collection finished | Checked: %d | Skipped(Dup): %d | Inserted: %d | Failed: %d",
        stats["checked"],
        stats["skipped_duplicate"],
        stats["inserted"],
        stats["failed"],
    )


if __name__ == "__main__":
    run_collector()
