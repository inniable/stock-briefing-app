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
  priority_only?: boolean;
  url: string;
}

const MAJOR_INSIDER_TICKERS = new Set([
  "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA",
  "AVGO", "LLY", "JPM", "WMT", "V", "XOM", "MA", "UNH", "ORCL", "COST",
  "NFLX", "AMD", "PLTR", "CRM", "GS", "MS", "BAC", "COIN", "ARM", "MU",
  "INTC", "QCOM", "PANW", "CRWD", "SNOW", "UBER", "ABNB", "BA", "CAT", "GE",
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
  const secUa = "StockBriefingApp AdminContact@example.com";

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
      const xml = typeof res.data === "string" ? res.data : String(res.data);

      if (feed.is_sec) {
        const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
        for (const entryXml of entries) {
          const rawTitle = extractTag(entryXml, "title");
          if (rawTitle.includes("(Subject)") || rawTitle.includes("(Reporting)")) {
            continue;
          }
          const link = extractAtomLink(entryXml);
          const updated =
            extractTag(entryXml, "updated") || new Date().toISOString();
          const summaryRaw = extractTag(entryXml, "summary");

          const cikMatch = rawTitle.match(/\((\d{10})\)/);
          const cik10 = cikMatch ? cikMatch[1] : "";
          const mapped = cik10 ? cikMap.get(cik10) : undefined;
          if (!mapped) continue;
          if (feed.priority_only && !MAJOR_INSIDER_TICKERS.has(mapped.ticker)) {
            continue;
          }

          const accMatch =
            entryXml.match(/(\d{10}-\d{2}-\d{6})/) ??
            link.match(/(\d{10}-\d{2}-\d{6})/);
          const uniqueId = accMatch ? accMatch[1] : link;
          if (seenIds.has(uniqueId)) continue;
          seenIds.add(uniqueId);

          const krName = getKoreanCompanyName(mapped.ticker);
          const displayLabel = krName
            ? `${mapped.title} (${krName})`
            : mapped.title;
          const itemMatches = summaryRaw.match(/Item\s+\d+\.\d+/gi) ?? [];
          const itemTags = itemMatches
            .slice(0, 2)
            .map((m) => humanizeKeyNumber(m));
          const isForm4 = feed.filing_type === "Form 4";

          collected.push({
            id: `apk-sec-${uniqueId}`,
            unique_id: uniqueId,
            ticker: mapped.ticker,
            company_name: mapped.title,
            source_type: "SEC",
            filing_type: feed.filing_type,
            original_title: rawTitle,
            headline_kr: isForm4
              ? `[실시간 Form 4] ${displayLabel} 임원·내부자 지분 변동 공시`
              : `[실시간 8-K] ${displayLabel} 신규 수시공시 접수`,
            sentiment: "Neutral",
            summary_lines: [
              summaryRaw ||
                `SEC EDGAR 실시간 피드를 통해 ${displayLabel}의 ${feed.filing_type} 공시가 접수되었습니다.`,
              "Supabase + Gemini 2.5 Flash 연동 시 한글 3줄 요약 및 호재/악재 분류가 자동 동기화됩니다.",
            ],
            key_numbers: [
              isForm4 ? "내부자 지분변동 (Form 4)" : "수시공시 (Form 8-K)",
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
