"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark,
  Building2,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  Hash,
  Minus,
  Newspaper,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  extractGlossaryHints,
  getKoreanCompanyName,
  humanizeKeyNumber,
} from "@/lib/marketMeta";
import type { FilingItem, SentimentType, SourceType } from "@/types/filing";

interface FilingCardProps {
  item: FilingItem;
  nowMs?: number;
  largeText?: boolean;
  isWatched?: boolean;
  isBookmarked?: boolean;
  isRead?: boolean;
  onSelectTicker?: (ticker: string) => void;
  onToggleWatchlist?: (ticker: string) => void;
  onToggleBookmark?: (uniqueId: string) => void;
  onMarkRead?: (uniqueId: string, toggle?: boolean) => void;
  onReportAi?: (item: FilingItem) => void;
}

function getSentimentMeta(sentiment: SentimentType) {
  switch (sentiment) {
    case "Bullish":
      return {
        label: "Bullish · 호재",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35",
        accentBorder: "border-l-emerald-500",
        Icon: TrendingUp,
      };
    case "Bearish":
      return {
        label: "Bearish · 악재",
        badgeClass:
          "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/35",
        accentBorder: "border-l-rose-500",
        Icon: TrendingDown,
      };
    default:
      return {
        label: "Neutral · 중립",
        badgeClass:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        accentBorder: "border-l-slate-400 dark:border-l-slate-600",
        Icon: Minus,
      };
  }
}

function getSourceMeta(sourceType: SourceType, filingType: string) {
  switch (sourceType) {
    case "SEC":
      return {
        label:
          filingType === "Form 4"
            ? "SEC 내부자(Form 4)"
            : filingType === "Form 144" || filingType === "144"
            ? "SEC 매도예고(144)"
            : filingType === "6-K"
            ? "SEC 글로벌상장(6-K)"
            : filingType.startsWith("NT 10")
            ? "SEC 실적지연(NT10)"
            : filingType === "DEF 14A"
            ? "SEC 주총안건(14A)"
            : filingType === "Schedule 13D"
            ? "SEC 대량보유(13D)"
            : filingType === "13F-HR"
            ? "SEC 기관보유(13F)"
            : filingType === "10-K"
            ? "SEC 연간보고서(10-K)"
            : filingType === "S-1"
            ? "SEC IPO신고(S-1)"
            : `SEC ${filingType || "8-K"}`,
        outlinkLabel: "SEC 공시 원문",
        badgeClass:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
        Icon: FileText,
      };
    case "PRESS":
      return {
        label:
          filingType === "Press Wire"
            ? "공식 보도자료"
            : filingType === "Fed Policy" || filingType === "Fed Release"
            ? "미 연준(Fed) 발표"
            : filingType === "FDA Release"
            ? "미 FDA 공식발표"
            : filingType === "DoD Contract"
            ? "미 국방부 수주계약"
            : filingType === "EIA Energy"
            ? "미 에너지청(EIA)"
            : filingType === "SEC Release"
            ? "SEC 공식 발표"
            : "기업 뉴스룸",
        outlinkLabel: "공식 발표 원문",
        badgeClass:
          "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
        Icon: Building2,
      };
    default:
      return {
        label:
          filingType === "Market Currents"
            ? "월가 실시간 속보"
            : filingType === "Congress Trade"
            ? "미 의회 주식거래"
            : filingType === "Popular Stocks"
            ? "인기종목 속보"
            : "금융 뉴스",
        outlinkLabel: "뉴스 원문 보기",
        badgeClass:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
        Icon: Newspaper,
      };
  }
}

function parseSafeDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  // Normalize space-separated Postgres timestamps if any (e.g. '2026-11-04 05:01:01+00')
  const normalized = isoDate.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatZoneParts(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const month = get("month").padStart(2, "0");
  const day = get("day").padStart(2, "0");
  const rawHour = get("hour");
  // Guard against Chromium/WebView h24 bug returning '24' at midnight
  const hour = rawHour === "24" ? "00" : rawHour.padStart(2, "0");
  const minute = get("minute").padStart(2, "0");

  return `${month}/${day} ${hour}:${minute}`;
}

function formatRelativeTime(isoDate: string, nowMs: number): string {
  const date = parseSafeDate(isoDate);
  if (!date) return "";

  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatZoneParts(date, "Asia/Seoul").split(" ")[0];
}

function formatDualTimezone(isoDate: string): { kst: string; et: string } {
  const date = parseSafeDate(isoDate);
  if (!date) return { kst: "", et: "" };

  return {
    kst: `한국 ${formatZoneParts(date, "Asia/Seoul")}`,
    et: `미동부 ${formatZoneParts(date, "America/New_York")}`,
  };
}

export default function FilingCard({
  item,
  nowMs = Date.now(),
  largeText = false,
  isWatched = false,
  isBookmarked = false,
  isRead = false,
  onSelectTicker,
  onToggleWatchlist,
  onToggleBookmark,
  onMarkRead,
  onReportAi,
}: FilingCardProps) {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sentimentMeta = getSentimentMeta(item.sentiment);
  const SentimentIcon = sentimentMeta.Icon;

  const sourceMeta = getSourceMeta(item.source_type, item.filing_type);
  const SourceIcon = sourceMeta.Icon;

  const summaryList = useMemo(
    () => (Array.isArray(item.summary_lines) ? item.summary_lines : []),
    [item.summary_lines]
  );
  const numbersList = useMemo(
    () =>
      (Array.isArray(item.key_numbers) ? item.key_numbers : []).map((tag) =>
        humanizeKeyNumber(tag)
      ),
    [item.key_numbers]
  );

  const isMarketMacro = item.ticker === "MARKET";
  const krName = getKoreanCompanyName(item.ticker);
  const companyLabel =
    krName && !item.company_name.includes(krName)
      ? `${krName} · ${item.company_name}`
      : item.company_name;

  const glossaryItems = useMemo(() => {
    const haystack = [
      item.filing_type,
      item.original_title,
      item.headline_kr,
      ...summaryList,
      ...numbersList,
    ].join(" ");
    return extractGlossaryHints(haystack);
  }, [item.filing_type, item.original_title, item.headline_kr, summaryList, numbersList]);

  const { kst, et } = formatDualTimezone(item.published_at);

  const handleCopySummary = async () => {
    const text = [
      `[$${item.ticker}] ${item.headline_kr} (${item.sentiment})`,
      ...summaryList.map((line) => `• ${line}`),
      `원문: ${item.source_url}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission failure
    }
  };

  return (
    <article
      className={`group relative rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 ${
        sentimentMeta.accentBorder
      } bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md ${
        isRead ? "opacity-75" : ""
      }`}
    >
      {/* Top Meta Row: Ticker + Watchlist Star + Korean/English Company + Source + Sentiment */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <div className="inline-flex items-center rounded-lg overflow-hidden border border-slate-900 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onSelectTicker?.(item.ticker)}
              className="inline-flex items-center gap-1 bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-xs font-extrabold tracking-wide text-white hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors"
            >
              {isMarketMacro ? (
                <>
                  <Globe className="h-3 w-3 shrink-0" />
                  <span>시황·거시</span>
                </>
              ) : (
                <span>${item.ticker}</span>
              )}
            </button>

            {!isMarketMacro && onToggleWatchlist && (
              <button
                type="button"
                aria-label={`${item.ticker} 관심종목 ${isWatched ? "해제" : "추가"}`}
                title={isWatched ? "관심종목 해제" : "관심종목 추가"}
                onClick={() => onToggleWatchlist(item.ticker)}
                className={`inline-flex items-center gap-0.5 px-2 py-1 border-l border-slate-700 text-[11px] font-bold transition-colors ${
                  isWatched
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-amber-300"
                }`}
              >
                <Star
                  className={`h-3 w-3 shrink-0 ${
                    isWatched ? "fill-slate-950" : ""
                  }`}
                />
                <span>{isWatched ? "관심중" : "관심+"}</span>
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[175px] sm:max-w-[250px]">
            {companyLabel}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold border ${sourceMeta.badgeClass}`}
          >
            <SourceIcon className="h-3 w-3 shrink-0" />
            {sourceMeta.label}
          </span>

          {isRead && (
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              읽음
            </span>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${sentimentMeta.badgeClass}`}
        >
          <SentimentIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{sentimentMeta.label}</span>
        </span>
      </div>

      {/* Korean One-Line AI Headline */}
      <h2
        className={`${
          largeText ? "text-lg sm:text-xl" : "text-base sm:text-lg"
        } font-extrabold leading-snug text-slate-950 dark:text-slate-50 tracking-tight mb-1.5 break-keep`}
      >
        {item.headline_kr}
      </h2>

      {/* Original Title Reference */}
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3.5 font-mono">
        {item.original_title}
      </p>

      {/* Core 3-Line Bullet Summary */}
      {summaryList.length > 0 && (
        <ul className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-3.5 mb-3.5">
          {summaryList.map((line, idx) => (
            <li
              key={`${item.id}-line-${idx}`}
              className={`flex items-start gap-2.5 ${
                largeText ? "text-base" : "text-sm"
              } leading-relaxed text-slate-800 dark:text-slate-200 font-medium break-keep`}
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-sky-400 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Key Financial Numbers + Beginner Glossary Trigger */}
      {(numbersList.length > 0 || glossaryItems.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          {numbersList.map((numTag, idx) => (
            <span
              key={`${item.id}-num-${idx}`}
              className={`inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 ${
                largeText ? "text-xs" : "text-[11px]"
              } font-mono font-semibold text-slate-800 dark:text-amber-200`}
            >
              <Hash className="h-2.5 w-2.5 text-blue-600 dark:text-amber-400 shrink-0" />
              {numTag}
            </span>
          ))}

          {glossaryItems.length > 0 && (
            <button
              type="button"
              onClick={() => setGlossaryOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                glossaryOpen
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
              }`}
            >
              <BookOpen className="h-3 w-3 shrink-0" />
              <span>용어 해설 ({glossaryItems.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Expandable Beginner Glossary Box (U07) */}
      {glossaryOpen && glossaryItems.length > 0 && (
        <div className="mb-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 p-3 space-y-1.5">
          {glossaryItems.map((g) => (
            <div key={g.term} className="text-xs leading-relaxed">
              <span className="font-extrabold text-indigo-900 dark:text-indigo-300">
                • {g.term}:{" "}
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {g.meaning}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory Footer: Dual KST/ET Timestamp + Action Icons + Official Outlink Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {formatRelativeTime(item.published_at, nowMs)}
          </span>
          {kst && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {kst}{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ({et})
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(item.unique_id, true)}
              title={isRead ? "안 읽음으로 표시" : "읽음으로 표시"}
              className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                isRead
                  ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopySummary()}
            title="요약 텍스트 복사"
            className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(item.unique_id)}
              title={isBookmarked ? "북마크 해제" : "북마크 저장"}
              className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                isBookmarked
                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`}
              />
            </button>
          )}

          {onReportAi && (
            <button
              type="button"
              onClick={() => onReportAi(item)}
              aria-label="AI 요약 오류 또는 부적절 콘텐츠 신고"
              title="AI 요약 오류·부적절 콘텐츠 신고"
              className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300 transition-colors"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}

          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onMarkRead?.(item.unique_id, false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 dark:bg-sky-500/15 dark:hover:bg-sky-600 active:scale-[0.98] border border-blue-200 hover:border-blue-600 dark:border-sky-500/30 px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-white dark:text-sky-300 dark:hover:text-white transition-all"
          >
            <span>{sourceMeta.outlinkLabel}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </article>
  );
}
