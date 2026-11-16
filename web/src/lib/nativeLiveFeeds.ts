import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  getKoreanCompanyName,
  humanizeKeyNumber,
  inferTickerFromNewsText,
} from "@/lib/marketMeta";
import type { FilingItem, SourceType } from "@/types/filing";

interface NativeFeedSpec {
  source_type: SourceType;
  filing_type: string;
  company_name: string;
  default_ticker: string;
  is_sec: boolean;
  is_sec_efts?: boolean;
  priority_only?: boolean;
  url: string;
}

const MAJOR_INSIDER_TICKERS = new Set([
  "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA",
  "AVGO", "LLY", "JPM", "WMT", "V", "XOM", "MA", "UNH", "ORCL", "COST",
  "NFLX", "AMD", "PLTR", "CRM", "GS", "MS", "BAC", "COIN", "ARM", "MU",
  "INTC", "QCOM", "PANW", "CRWD", "SNOW", "UBER", "ABNB", "BA", "CAT", "GE",
  "TSM", "ASML", "NVO", "IONQ", "RKLB", "SMCI", "LMT", "RTX", "MSTR",
]);

const NATIVE_FEEDS: NativeFeedSpec[] = [
  {
    source_type: "SEC",
    filing_type: "8-K",
    company_name: "SEC EDGAR",
    default_ticker: "SEC",
    is_sec: true,
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=8-K&company=&dateb=&owner=exclude&start=0&count=20&output=atom",
  },
  {
    source_type: "SEC",
    filing_type: "Form 4",
    company_name: "SEC EDGAR",
    default_ticker: "SEC",
    is_sec: true,
    priority_only: true,
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=4&company=&dateb=&owner=only&start=0&count=25&output=atom",
  },
  {
    source_type: "SEC",
    filing_type: "Schedule 13D",
    company_name: "SEC EDGAR",
    default_ticker: "SEC",
    is_sec: true,
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=SCHEDULE+13D&company=&dateb=&owner=include&start=0&count=20&output=atom",
  },
  {
    source_type: "SEC",
    filing_type: "13F-HR",
    company_name: "SEC EDGAR",
    default_ticker: "SEC",
    is_sec: true,
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=13F-HR&company=&dateb=&owner=include&start=0&count=15&output=atom",
  },
  {
    source_type: "SEC",
    filing_type: "Form 144",
    company_name: "SEC EDGAR",
    default_ticker: "SEC",
    is_sec: true,
    is_sec_efts: true,
    url: "https://efts.sec.gov/LATEST/search-index?forms=144,6-K,NT%2010-Q,NT%2010-K,DEF%2014A",
  },
  {
    source_type: "PRESS",
    filing_type: "FDA Release",
    company_name: "미 식품의약국(FDA)",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
  },
  {
    source_type: "PRESS",
    filing_type: "DoD Contract",
    company_name: "미 국방부(DoD)",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=400&Site=945&max=10",
  },
  {
    source_type: "PRESS",
    filing_type: "EIA Energy",
    company_name: "미 에너지정보청(EIA)",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.eia.gov/rss/press_rss.xml",
  },
  {
    source_type: "PRESS",
    filing_type: "Newsroom",
    company_name: "AMD",
    default_ticker: "AMD",
    is_sec: false,
    url: "https://ir.amd.com/news-events/press-releases/rss",
  },
  {
    source_type: "NEWS",
    filing_type: "Popular Stocks",
    company_name: "서학개미 인기종목",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=PLTR,AVGO,LLY,TSM,ARM,IONQ,RKLB,MU,INTC,TSLA&region=US&lang=en-US",
  },
  {
    source_type: "NEWS",
    filing_type: "Congress Trade",
    company_name: "미 의회 주식거래",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://news.google.com/rss/search?q=%22Periodic+Transaction+Report%22+OR+%22congressional+stock%22+OR+%22Pelosi%22+stock+trade&hl=en-US&gl=US&ceid=US:en",
  },
  {
    source_type: "PRESS",
    filing_type: "Fed Policy",
    company_name: "미 연준(Fed)",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
  },
  {
    source_type: "NEWS",
    filing_type: "Market Currents",
    company_name: "Seeking Alpha",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://seekingalpha.com/market_currents.xml",
  },
  {
    source_type: "NEWS",
    filing_type: "Earnings News",
    company_name: "Nasdaq Earnings",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Earnings",
  },
  {
    source_type: "NEWS",
    filing_type: "Market News",
    company_name: "Yahoo Finance",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC&region=US&lang=en-US",
  },
  {
    source_type: "NEWS",
    filing_type: "Market News",
    company_name: "CNBC Finance",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
  },
  {
    source_type: "NEWS",
    filing_type: "Top Stories",
    company_name: "MarketWatch",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  },
  {
    source_type: "PRESS",
    filing_type: "Press Wire",
    company_name: "PR Newswire",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss",
  },
  {
    source_type: "PRESS",
    filing_type: "Press Wire",
    company_name: "PR Newswire Tech",
    default_ticker: "MARKET",
    is_sec: false,
    url: "https://www.prnewswire.com/rss/consumer-technology-latest-news/consumer-technology-latest-news-list.rss",
  },
];

let cachedNativeCikMap: Map<string, { ticker: string; title: string }> | null =
  null;

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(regex);
  return match ? decodeXmlEntities(match[1]) : "";
}

function extractAtomLink(block: string): string {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1].trim();
  return extractTag(block, "link");
}

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function fetchNativeLiveFeeds(): Promise<FilingItem[]> {
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@inniable.dev";
  const secUa = `StockBriefingApp ${contactEmail}`;

  if (!cachedNativeCikMap) {
    cachedNativeCikMap = new Map();
    try {
      const cikRes = await CapacitorHttp.get({
        url: "https://www.sec.gov/files/company_tickers.json",
        headers: { "User-Agent": secUa },
      });
      if (cikRes.status === 200 && cikRes.data) {
        const json = (
          typeof cikRes.data === "string"
            ? JSON.parse(cikRes.data)
            : cikRes.data
        ) as Record<string, { cik_str: number; ticker: string; title: string }>;
        for (const entry of Object.values(json)) {
          const cik10 = String(entry.cik_str).padStart(10, "0");
          cachedNativeCikMap.set(cik10, {
            ticker: entry.ticker.toUpperCase(),
            title: entry.title,
          });
        }
      }
    } catch {
      // Safe fallback
    }
  }

  const cikMap = cachedNativeCikMap;
  const collected: FilingItem[] = [];
  const seenIds = new Set<string>();

  for (const [idx, feed] of NATIVE_FEEDS.entries()) {
    try {
      if (feed.is_sec && idx > 0) {
        await new Promise((r) => setTimeout(r, 220));
      }
      const res = await CapacitorHttp.get({
        url: feed.url,
        headers: {
          "User-Agent": feed.is_sec
            ? secUa
            : "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
        },
      });
      if (res.status !== 200 || !res.data) continue;
      if (feed.is_sec_efts) {
        const parsedJson = (
          typeof res.data === "string" ? JSON.parse(res.data) : res.data
        ) as {
          hits?: {
            hits?: Array<{
              _source?: {
                adsh?: string;
                ciks?: string[];
                display_names?: string[];
                form?: string;
                file_date?: string;
              };
            }>;
          };
        };
        const hits = parsedJson.hits?.hits ?? [];
        for (const h of hits.slice(0, 20)) {
          const src = h._source;
          if (!src?.adsh) continue;
          const adsh = src.adsh;
          if (seenIds.has(adsh)) continue;

          const dispNames = src.display_names ?? [];
          const ciks = src.ciks ?? [];
          const formCode = src.form || "144";
          let resolvedTicker = "";
          let resolvedTitle = "";

          for (const dn of dispNames) {
            const tkMatch = dn.match(/\(([A-Z]{1,5}(?:-[A-Z])?)\)\s*\(CIK/);
            if (tkMatch) {
              resolvedTicker = tkMatch[1].toUpperCase();
              resolvedTitle = dn.split("(")[0].trim();
              break;
            }
            const cikM = dn.match(/CIK\s*(\d{10})/);
            if (cikM && cikMap.has(cikM[1])) {
              const m = cikMap.get(cikM[1])!;
              resolvedTicker = m.ticker;
              resolvedTitle = m.title;
              break;
            }
          }
          if (!resolvedTicker) {
            for (const c of ciks) {
              const c10 = String(c).padStart(10, "0");
              if (cikMap.has(c10)) {
                const m = cikMap.get(c10)!;
                resolvedTicker = m.ticker;
                resolvedTitle = m.title;
                break;
              }
            }
          }
          if (!resolvedTicker || !resolvedTitle) continue;
          seenIds.add(adsh);

          const primaryCikInt = ciks.length > 0 ? parseInt(ciks[0], 10) : 0;
          const link = `https://www.sec.gov/Archives/edgar/data/${primaryCikInt}/${adsh.replace(/-/g, "")}/${adsh}-index.htm`;
          const krName = getKoreanCompanyName(resolvedTicker);
          const displayLabel = krName
            ? `${resolvedTitle} (${krName})`
            : resolvedTitle;
          const headline =
            formCode === "144"
              ? `[실시간 Form 144] ${displayLabel} 임원·대주주 주식 매도 사전예고`
              : formCode === "6-K"
              ? `[실시간 6-K] ${displayLabel} 글로벌 상장사 수시공시`
              : formCode.startsWith("NT 10")
              ? `[실시간 경보 ${formCode}] ${displayLabel} 실적 보고서 제출 지연 통보`
              : `[실시간 ${formCode}] ${displayLabel} 주주총회 안건·위임장 공시`;

          collected.push({
            id: `apk-efts-${adsh}`,
            unique_id: adsh,
            ticker: resolvedTicker,
            company_name: resolvedTitle,
            source_type: "SEC",
            filing_type: formCode === "144" ? "Form 144" : formCode,
            original_title: `${formCode} - ${dispNames.join(" | ")}`,
            headline_kr: headline,
            sentiment: formCode.startsWith("NT 10") ? "Bearish" : "Neutral",
            summary_lines: [
              `SEC EDGAR에 ${displayLabel}의 ${formCode} 공시(${dispNames.join(" · ")})가 접수되었습니다.`,
              "하단 'SEC 공시 원문' 버튼으로 즉시 상세 공시 내역을 확인하실 수 있습니다.",
            ],
            key_numbers: [humanizeKeyNumber(formCode)],
            source_url: link,
            published_at: src.file_date
              ? new Date(`${src.file_date}T12:00:00Z`).toISOString()
              : new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
        continue;
      }

      const xml = typeof res.data === "string" ? res.data : String(res.data);

      if (feed.is_sec) {
        const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
        for (const entryXml of entries) {
          const rawTitle = extractTag(entryXml, "title");
          if (feed.filing_type === "Schedule 13D") {
            if (rawTitle.includes("(Filed by)") || rawTitle.includes("(Reporting)")) {
              continue;
            }
          } else if (rawTitle.includes("(Subject)") || rawTitle.includes("(Reporting)")) {
            continue;
          }
          const link = extractAtomLink(entryXml);
          const updated =
            extractTag(entryXml, "updated") || new Date().toISOString();
          const summaryRaw = extractTag(entryXml, "summary");

          const cikMatch = rawTitle.match(/\((\d{10})\)/);
          const cik10 = cikMatch ? cikMatch[1] : "";
          const mapped = cik10 ? cikMap.get(cik10) : undefined;
          const fallbackNameMatch = rawTitle.match(/^[^-]+-\s*(.+?)\s*\(\d{10}\)/);
          const resolvedTicker = mapped?.ticker ?? (feed.filing_type === "13F-HR" ? "MARKET" : "");
          const resolvedTitle = mapped?.title ?? (fallbackNameMatch ? fallbackNameMatch[1].trim() : "");
          if (!resolvedTicker || !resolvedTitle) continue;
          if (feed.priority_only && !MAJOR_INSIDER_TICKERS.has(resolvedTicker)) {
            continue;
          }

          const accMatch =
            entryXml.match(/(\d{10}-\d{2}-\d{6})/) ??
            link.match(/(\d{10}-\d{2}-\d{6})/);
          const uniqueId = accMatch ? accMatch[1] : link;
          if (seenIds.has(uniqueId)) continue;
          seenIds.add(uniqueId);

          const krName = getKoreanCompanyName(resolvedTicker);
          const displayLabel =
            krName && resolvedTicker !== "MARKET"
              ? `${resolvedTitle} (${krName})`
              : resolvedTitle;
          const itemMatches = summaryRaw.match(/Item\s+\d+\.\d+/gi) ?? [];
          const itemTags = itemMatches
            .slice(0, 2)
            .map((m) => humanizeKeyNumber(m));
          const isForm4 = feed.filing_type === "Form 4";
          const is13D = feed.filing_type === "Schedule 13D";
          const is13F = feed.filing_type === "13F-HR";

          collected.push({
            id: `apk-sec-${uniqueId}`,
            unique_id: uniqueId,
            ticker: resolvedTicker,
            company_name: resolvedTitle,
            source_type: "SEC",
            filing_type: feed.filing_type,
            original_title: rawTitle,
            headline_kr: isForm4
              ? `[실시간 Form 4] ${displayLabel} 임원·내부자 지분 변동 공시`
              : is13D
              ? `[실시간 13D] ${displayLabel} 5% 이상 대량보유·행동주의 지분 공시`
              : is13F
              ? `[실시간 13F] ${displayLabel} 기관투자자 분기 보유 종목 공시`
              : `[실시간 8-K] ${displayLabel} 신규 수시공시 접수`,
            sentiment: "Neutral",
            summary_lines: [
              summaryRaw ||
                `SEC EDGAR 실시간 피드를 통해 ${displayLabel}의 ${feed.filing_type} 공시가 접수되었습니다.`,
              "Supabase + Gemini 연동 시 한글 3줄 요약 및 호재/악재 분류가 자동 동기화됩니다.",
            ],
            key_numbers: [
              isForm4
                ? "내부자 지분변동 (Form 4)"
                : is13D
                ? "5% 대량보유·행동주의 (13D)"
                : is13F
                ? "기관 포트폴리오 (13F-HR)"
                : "수시공시 (Form 8-K)",
              ...itemTags,
            ],
            source_url: link,
            published_at: new Date(updated).toISOString(),
            created_at: new Date().toISOString(),
          });
        }
      } else {
        const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
        for (const itemXml of items.slice(0, 6)) {
          const title = extractTag(itemXml, "title");
          const link = extractTag(itemXml, "link");
          const pubDate = extractTag(itemXml, "pubDate");
          const desc = extractTag(itemXml, "description");
          if (!title || !link || seenIds.has(link)) continue;
          seenIds.add(link);

          const parsedDate = pubDate ? new Date(pubDate) : new Date();
          const isoDate = Number.isNaN(parsedDate.getTime())
            ? new Date().toISOString()
            : parsedDate.toISOString();
          const inferred = inferTickerFromNewsText(
            title,
            desc,
            feed.company_name
          );

          collected.push({
            id: `apk-rss-${link}`,
            unique_id: link,
            ticker: inferred.ticker,
            company_name: inferred.companyName,
            source_type: feed.source_type,
            filing_type: feed.filing_type,
            original_title: title,
            headline_kr: `[실시간 ${feed.company_name}] ${title}`,
            sentiment: "Neutral",
            summary_lines: [
              desc
                ? desc.slice(0, 220)
                : `${feed.company_name} 실시간 RSS 피드에서 수신된 최신 뉴스입니다.`,
            ],
            key_numbers: [
              feed.company_name,
              inferred.ticker !== "MARKET"
                ? `종목 감지: $${inferred.ticker}`
                : feed.filing_type,
            ],
            source_url: link,
            published_at: isoDate,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Per-feed error isolation
    }
  }

  collected.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return collected.slice(0, 35);
}
