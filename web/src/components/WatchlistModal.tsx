"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, Star, Trash2, X } from "lucide-react";
import { getKoreanCompanyName, searchStockCatalog } from "@/lib/marketMeta";

interface WatchlistModalProps {
  open: boolean;
  watchlist: string[];
  onClose: () => void;
  onToggleTicker: (ticker: string) => void;
  onClearAll: () => void;
}

const CUSTOM_TICKER_REGEX = /^[A-Z]{1,5}(?:-[A-Z])?$/;

export default function WatchlistModal({
  open,
  watchlist,
  onClose,
  onToggleTicker,
  onClearAll,
}: WatchlistModalProps) {
  const [query, setQuery] = useState("");

  const watchlistSet = useMemo(
    () => new Set(watchlist.map((t) => t.toUpperCase())),
    [watchlist]
  );

  const suggestions = useMemo(() => searchStockCatalog(query), [query]);

  const normalizedCustomCandidate = useMemo(() => {
    const raw = query.trim().toUpperCase().replace(/^\$/, "");
    if (!CUSTOM_TICKER_REGEX.test(raw)) return null;
    if (suggestions.some((s) => s.ticker === raw)) return null;
    return raw;
  }, [query, suggestions]);

  if (!open) return null;

  const handleAddCustom = () => {
    if (!normalizedCustomCandidate) return;
    if (!watchlistSet.has(normalizedCustomCandidate)) {
      onToggleTicker(normalizedCustomCandidate);
    }
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-xs">
              <Star className="h-4 w-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                내 관심종목 설정 ({watchlist.length}개)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                한글 기업명이나 티커로 검색해 원클릭 추가·삭제하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Currently Registered Watchlist Chips */}
        <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
              등록된 관심종목 ({watchlist.length})
            </span>
            {watchlist.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                <span>전체 비우기</span>
              </button>
            )}
          </div>

          {watchlist.length === 0 ? (
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 py-1">
              아직 등록된 종목이 없습니다. 아래에서 원하는 종목을 터치해 담아보세요!
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {watchlist.map((ticker) => {
                const kr = getKoreanCompanyName(ticker);
                return (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => onToggleTicker(ticker)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-2xs active:scale-95 transition-transform"
                  >
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                    <span>
                      ${ticker}
                      {kr && kr !== ticker ? ` ${kr}` : ""}
                    </span>
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600 ml-0.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Input (Supports Korean Company Name & Any US Ticker) */}
        <div className="relative shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && normalizedCustomCandidate) {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="종목 검색 (예: 테슬라, 엔비디아, 팔란티어, TSLA, IONQ...)"
            className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Direct Custom Ticker Add Button (if user typed an unlisted US ticker like VST, ASTS, TEM) */}
        {normalizedCustomCandidate && (
          <button
            type="button"
            onClick={handleAddCustom}
            className="w-full flex items-center justify-between rounded-xl bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 px-3.5 py-2.5 text-xs font-extrabold text-blue-700 dark:text-sky-300 shrink-0"
          >
            <span>
              미국 티커 <strong>${normalizedCustomCandidate}</strong> 직접 관심종목에 추가하기
            </span>
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        )}

        {/* Scrollable Popular / Filtered Stock List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {query.trim() ? "검색 결과 (터치하여 추가·해제)" : "인기 미국주식 · ETF 원클릭 선택"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map(({ ticker, krName }) => {
              const active = watchlistSet.has(ticker);
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => onToggleTicker(ticker)}
                  className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                    active
                      ? "bg-amber-400/20 dark:bg-amber-400/15 border-amber-400 text-slate-950 dark:text-white shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold truncate">
                      ${ticker}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {krName}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      active
                        ? "bg-amber-400 text-slate-950"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    {active ? (
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-slate-900 dark:bg-sky-500 hover:bg-slate-800 py-3 text-sm font-extrabold text-white dark:text-slate-950 shadow-sm shrink-0 transition-colors"
        >
          설정 완료
        </button>
      </div>
    </div>
  );
}
