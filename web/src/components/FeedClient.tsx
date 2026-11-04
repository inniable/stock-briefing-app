"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  Bookmark,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Home,
  Moon,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Type,
  X,
} from "lucide-react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  getKoreanCompanyName,
  inferSector,
  itemMatchesWatchlist,
  SECTOR_TABS,
  type SectorId,
} from "@/lib/marketMeta";
import { fetchNativeLiveFeeds, isNativeApp } from "@/lib/nativeLiveFeeds";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  DEFAULT_QUICK_TICKERS,
  DEMO_FILINGS,
  SIMULATED_LIVE_FILINGS,
  type FilingItem,
  type SentimentType,
  type SourceType,
} from "@/types/filing";
import FilingCard from "./FilingCard";
import MobileInstallModal, {
  type BeforeInstallPromptEvent,
} from "./MobileInstallModal";
import WatchlistModal from "./WatchlistModal";

type SentimentFilter = "ALL" | SentimentType;
type SourceFilter = "ALL" | SourceType;

const LS_WATCHLIST = "sb_watchlist_v1";
const LS_BOOKMARKS = "sb_bookmarks_v1";
const LS_READ_IDS = "sb_read_ids_v1";
const LS_THEME = "sb_theme_v1";
const LS_LARGE_TEXT = "sb_large_text_v1";

export default function FeedClient() {
  const [items, setItems] = useState<FilingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [livePreviewLoading, setLivePreviewLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [newItemsBannerCount, setNewItemsBannerCount] = useState<number>(0);

  // Mobile PWA & Drawer States
  const [mobileModalOpen, setMobileModalOpen] = useState<boolean>(false);
  const [watchlistModalOpen, setWatchlistModalOpen] = useState<boolean>(false);
  const [isInstalledApp, setIsInstalledApp] = useState<boolean>(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] =
    useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Personalization & Accessibility States (Persisted in localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<string[]>([
    "NVDA",
    "LLY",
    "JPM",
    "AAPL",
  ]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Filter States
  const [selectedTicker, setSelectedTicker] = useState<string>("ALL");
  const [selectedSector, setSelectedSector] = useState<SectorId>("ALL");
  const [selectedSentiment, setSelectedSentiment] =
    useState<SentimentFilter>("ALL");
  const [selectedSource, setSelectedSource] = useState<SourceFilter>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [showAllTickers, setShowAllTickers] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [simIndex, setSimIndex] = useState<number>(0);

  // Hydrate user preferences, PWA install prompt, and URL shortcut params
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(LS_THEME);
      if (savedTheme === "dark") {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      }

      if (localStorage.getItem(LS_LARGE_TEXT) === "1") {
        setLargeText(true);
      }

      const savedWatch = localStorage.getItem(LS_WATCHLIST);
      if (savedWatch) {
        const parsed = JSON.parse(savedWatch) as string[];
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }

      const savedMarks = localStorage.getItem(LS_BOOKMARKS);
      if (savedMarks) {
        const parsed = JSON.parse(savedMarks) as string[];
        if (Array.isArray(parsed)) setBookmarkedIds(parsed);
      }

      const savedRead = localStorage.getItem(LS_READ_IDS);
      if (savedRead) {
        const parsed = JSON.parse(savedRead) as string[];
        if (Array.isArray(parsed)) setReadIds(parsed);
      }

      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "watchlist") {
        setSelectedTicker("WATCHLIST");
      } else if (tab === "sec") {
        setSelectedSource("SEC");
      }

      const standalone =
        isNativeApp() ||
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsInstalledApp(standalone);
    } catch {
      // Ignore storage errors
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem(LS_THEME, "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(LS_THEME, "light");
      }
      return next;
    });
  };

  const toggleLargeText = () => {
    setLargeText((prev) => {
      const next = !prev;
      localStorage.setItem(LS_LARGE_TEXT, next ? "1" : "0");
      return next;
    });
  };

  const handleToggleWatchlist = useCallback((ticker: string) => {
    const upper = ticker.trim().toUpperCase().replace(/^\$/, "");
    if (!upper || upper === "MARKET") return;
    setWatchlist((prev) => {
      const next = prev.includes(upper)
        ? prev.filter((t) => t !== upper)
        : [upper, ...prev];
      try {
        localStorage.setItem(LS_WATCHLIST, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlist([]);
    try {
      localStorage.setItem(LS_WATCHLIST, JSON.stringify([]));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const handleToggleBookmark = useCallback((uniqueId: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(uniqueId)
        ? prev.filter((id) => id !== uniqueId)
        : [uniqueId, ...prev];
      try {
        localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const handleMarkRead = useCallback((uniqueId: string, toggle = false) => {
    setReadIds((prev) => {
      let next: string[];
      if (toggle) {
        next = prev.includes(uniqueId)
          ? prev.filter((id) => id !== uniqueId)
          : [uniqueId, ...prev].slice(0, 300);
      } else {
        if (prev.includes(uniqueId)) return prev;
        next = [uniqueId, ...prev].slice(0, 300);
      }
      try {
        localStorage.setItem(LS_READ_IDS, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const handleSimulateIncoming = () => {
    const template =
      SIMULATED_LIVE_FILINGS[simIndex % SIMULATED_LIVE_FILINGS.length];
    const nowIso = new Date().toISOString();
    const simulatedItem: FilingItem = {
      ...template,
      id: `sim-${Date.now()}`,
      unique_id: `${template.unique_id}-${Date.now()}`,
      published_at: nowIso,
      created_at: nowIso,
    };
    setItems((prev) => [simulatedItem, ...prev]);
    setNewItemsBannerCount((count) => count + 1);
    setSimIndex((idx) => idx + 1);
  };

  // Sync Android Native StatusBar & Hardware Back Button when running inside APK
  useEffect(() => {
    if (!isNativeApp()) return;

    void StatusBar.setBackgroundColor({
      color: darkMode ? "#020617" : "#ffffff",
    }).catch(() => {});
    void StatusBar.setStyle({
      style: darkMode ? Style.Dark : Style.Light,
    }).catch(() => {});
  }, [darkMode]);

  useEffect(() => {
    if (!isNativeApp()) return;

    const listenerPromise = App.addListener("backButton", () => {
      if (watchlistModalOpen) {
        setWatchlistModalOpen(false);
      } else if (mobileModalOpen) {
        setMobileModalOpen(false);
      } else if (searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      } else if (selectedTicker !== "ALL" || selectedSource !== "ALL") {
        setSelectedTicker("ALL");
        setSelectedSource("ALL");
      } else {
        void App.exitApp();
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [watchlistModalOpen, mobileModalOpen, searchOpen, selectedTicker, selectedSource]);

  const handleLoadRealLiveRss = async () => {
    setLivePreviewLoading(true);
    setErrorMsg(null);
    try {
      let fetched: FilingItem[] = [];
      if (isNativeApp()) {
        fetched = await fetchNativeLiveFeeds();
      } else {
        const res = await fetch("/api/live-preview");
        if (!res.ok) {
          throw new Error("실시간 RSS 미리보기 요청에 실패했습니다.");
        }
        const json = (await res.json()) as { items?: FilingItem[] };
        fetched = json.items ?? [];
      }
      if (fetched.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((x) => x.unique_id));
          const fresh = fetched.filter((x) => !existingIds.has(x.unique_id));
          const merged = [...fresh, ...prev];
          merged.sort(
            (a, b) =>
              new Date(b.published_at).getTime() -
              new Date(a.published_at).getTime()
          );
          return merged;
        });
        setNewItemsBannerCount(fetched.length);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "실시간 피드를 가져오는 중 오류가 발생했습니다."
      );
    } finally {
      setLivePreviewLoading(false);
    }
  };

  const fetchFilings = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setItems(DEMO_FILINGS);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("filings_feed")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(150);

      if (error) {
        throw error;
      }

      setItems((data as FilingItem[]) ?? []);
      setNewItemsBannerCount(0);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "데이터를 불러오는 중 오류가 발생했습니다.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchFilings(false);

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      return;
    }

    const channel = client
      .channel("realtime-filings-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "filings_feed",
        },
        (payload) => {
          const inserted = payload.new as FilingItem;
          setItems((prev) => {
            if (prev.some((existing) => existing.unique_id === inserted.unique_id)) {
              return prev;
            }
            return [inserted, ...prev];
          });
          setNewItemsBannerCount((count) => count + 1);
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchFilings]);

  const allTickerChips = useMemo(() => {
    const seen = new Set<string>(DEFAULT_QUICK_TICKERS);
    const ordered: string[] = [...DEFAULT_QUICK_TICKERS];
    for (const w of watchlist) {
      if (w && !seen.has(w)) {
        seen.add(w);
        ordered.push(w);
      }
    }
    for (const item of items) {
      const t = (item.ticker || "").trim().toUpperCase();
      if (t && !seen.has(t)) {
        seen.add(t);
        ordered.push(t);
      }
    }
    return ordered;
  }, [items, watchlist]);

  const visibleTickerChips = showAllTickers
    ? allTickerChips
    : allTickerChips.slice(0, 14);
  const hiddenTickerCount = Math.max(
    0,
    allTickerChips.length - visibleTickerChips.length
  );

  const watchlistSet = useMemo(() => new Set(watchlist), [watchlist]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const activeSubFilterCount =
    (selectedSector !== "ALL" ? 1 : 0) +
    (selectedSentiment !== "ALL" ? 1 : 0) +
    (selectedSource !== "ALL" ? 1 : 0) +
    (unreadOnly ? 1 : 0);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (selectedTicker === "WATCHLIST") {
        if (!itemMatchesWatchlist(item, watchlistSet)) return false;
      } else if (selectedTicker === "BOOKMARKS") {
        if (!bookmarkSet.has(item.unique_id)) return false;
      } else if (selectedTicker !== "ALL" && item.ticker !== selectedTicker) {
        return false;
      }

      if (selectedSector !== "ALL") {
        const itemSector = inferSector(
          item.ticker,
          `${item.company_name} ${item.headline_kr} ${item.original_title}`
        );
        if (itemSector !== selectedSector) return false;
      }

      if (selectedSentiment !== "ALL" && item.sentiment !== selectedSentiment) {
        return false;
      }
      if (selectedSource !== "ALL" && item.source_type !== selectedSource) {
        return false;
      }
      if (unreadOnly && readSet.has(item.unique_id)) {
        return false;
      }

      if (q) {
        const krComp = getKoreanCompanyName(item.ticker) ?? "";
        const haystack = [
          item.ticker,
          krComp,
          item.company_name,
          item.filing_type,
          item.headline_kr,
          item.original_title,
          ...(Array.isArray(item.summary_lines) ? item.summary_lines : []),
          ...(Array.isArray(item.key_numbers) ? item.key_numbers : []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    items,
    selectedTicker,
    selectedSector,
    selectedSentiment,
    selectedSource,
    unreadOnly,
    watchlistSet,
    bookmarkSet,
    readSet,
    searchQuery,
  ]);

  const countsBySentiment = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    for (const item of items) {
      if (selectedTicker === "WATCHLIST" && !watchlistSet.has(item.ticker)) {
        continue;
      }
      if (selectedTicker === "BOOKMARKS" && !bookmarkSet.has(item.unique_id)) {
        continue;
      }
      if (
        selectedTicker !== "ALL" &&
        selectedTicker !== "WATCHLIST" &&
        selectedTicker !== "BOOKMARKS" &&
        item.ticker !== selectedTicker
      ) {
        continue;
      }
      if (selectedSource !== "ALL" && item.source_type !== selectedSource) {
        continue;
      }
      if (item.sentiment === "Bullish") bullish += 1;
      else if (item.sentiment === "Bearish") bearish += 1;
      else neutral += 1;
    }
    return { bullish, bearish, neutral };
  }, [items, selectedTicker, selectedSource, watchlistSet, bookmarkSet]);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Sticky Mobile-Slim App Header with Safe-Area Top */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-xs pt-safe">
        <div className="mx-auto max-w-2xl px-3.5 sm:px-4 pt-3 pb-2">
          {/* Top Brand & Action Controls Row */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => {
                setSelectedTicker("ALL");
                setSelectedSource("ALL");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 min-w-0 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xs">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] sm:text-lg font-extrabold tracking-tight text-slate-950 dark:text-white truncate">
                    US 공시·뉴스 브리핑
                  </h1>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      realtimeConnected
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}
                  >
                    <Radio
                      className={`h-2.5 w-2.5 ${
                        realtimeConnected
                          ? "animate-pulse text-emerald-600"
                          : "text-slate-500"
                      }`}
                    />
                    {realtimeConnected
                      ? "LIVE"
                      : isSupabaseConfigured
                        ? "SYNC"
                        : "TEST"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                  SEC 8-K·Form 4 · 보도자료 · 글로벌 금융뉴스 3줄 요약
                </p>
              </div>
            </button>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Desktop QR / Mobile Connect Button */}
              <button
                type="button"
                onClick={() => setMobileModalOpen(true)}
                className="hidden sm:inline-flex h-9 px-2.5 items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 text-xs font-extrabold text-blue-700 dark:text-sky-300 hover:bg-blue-100 transition-colors"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>모바일 연결</span>
              </button>

              <button
                type="button"
                aria-label="큰 글씨 모드 전환"
                title={largeText ? "기본 글씨 크기로 변경" : "큰 글씨 모드 켜기"}
                onClick={toggleLargeText}
                className={`flex h-9 px-2 items-center justify-center gap-0.5 rounded-xl border text-xs font-extrabold transition-colors ${
                  largeText
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Type className="h-3.5 w-3.5" />
                <span className="text-[11px]">가+</span>
              </button>

              <button
                type="button"
                aria-label={darkMode ? "라이트 모드로 전환" : "야간 다크 모드로 전환"}
                onClick={toggleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                aria-label="검색 열기"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  if (searchOpen) setSearchQuery("");
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  searchOpen
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-sky-500/20 dark:border-sky-500/40 dark:text-sky-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {searchOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>

              {/* Mobile Compact Sub-Filter Drawer Toggle */}
              <button
                type="button"
                aria-label="상세 필터 열기"
                onClick={() => setMobileFiltersExpanded((prev) => !prev)}
                className={`relative sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  mobileFiltersExpanded || activeSubFilterCount > 0
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-sky-500/20 dark:border-sky-500/40 dark:text-sky-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeSubFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-extrabold text-white">
                    {activeSubFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label="새로고침"
                onClick={() => void fetchFilings(true)}
                disabled={refreshing}
                className="hidden xs:flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Search Input */}
          {searchOpen && (
            <div className="mb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="한글/영문 종목명·티커·키워드 (예: 일라이, 코스트코, LLY, Form 4)"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ticker Filter Chips (Always 1-Swipe Accessible on Mobile & Desktop) */}
          <div
            className={`flex items-center gap-1.5 pb-1 ${
              showAllTickers ? "flex-wrap" : "overflow-x-auto no-scrollbar"
            }`}
          >
            {/* Desktop Watchlist & Bookmarks Chips (Mobile also has Bottom Nav) */}
            <button
              type="button"
              onClick={() => setSelectedTicker("WATCHLIST")}
              className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                selectedTicker === "WATCHLIST"
                  ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100"
              }`}
            >
              <Star className="h-3 w-3 fill-current" />
              <span>관심종목 ({watchlist.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setWatchlistModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-all border bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>관심설정</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTicker("BOOKMARKS")}
              className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all border ${
                selectedTicker === "BOOKMARKS"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Bookmark className="h-3 w-3" />
              <span>저장됨 ({bookmarkedIds.length})</span>
            </button>

            {visibleTickerChips.map((ticker) => {
              const active = selectedTicker === ticker;
              const kr = getKoreanCompanyName(ticker);
              const chipLabel =
                ticker === "ALL"
                  ? "전체 종목"
                  : ticker === "MARKET"
                    ? "시황·거시"
                    : kr && ticker !== "AMD" && ticker !== "IBM"
                      ? `$${ticker} ${kr}`
                      : `$${ticker}`;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedTicker(ticker)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                    active
                      ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 border-slate-900 dark:border-sky-400 shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {chipLabel}
                </button>
              );
            })}

            {(hiddenTickerCount > 0 || showAllTickers) && (
              <button
                type="button"
                onClick={() => setShowAllTickers((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {showAllTickers ? (
                  <>
                    <span>접기</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>+{hiddenTickerCount}개 더보기</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Secondary Filter Rows: Always visible on Desktop, Collapsible on Mobile to maximize reading space */}
          <div
            className={`${
              mobileFiltersExpanded ? "block" : "hidden sm:block"
            } pt-1 space-y-1`}
          >
            {/* Sector Filter Row */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 border-t border-slate-100 dark:border-slate-800/80">
              {SECTOR_TABS.map((sec) => {
                const active = selectedSector === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSector(sec.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>

            {/* Sentiment + Source + Unread Filter Row */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSentiment("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    selectedSentiment === "ALL"
                      ? "bg-slate-900 dark:bg-slate-700 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  전체 감성
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSentiment("Bullish")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    selectedSentiment === "Bullish"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  }`}
                >
                  호재 ({countsBySentiment.bullish})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSentiment("Bearish")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    selectedSentiment === "Bearish"
                      ? "bg-rose-600 text-white"
                      : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  }`}
                >
                  악재 ({countsBySentiment.bearish})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSentiment("Neutral")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    selectedSentiment === "Neutral"
                      ? "bg-slate-700 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  중립 ({countsBySentiment.neutral})
                </button>

                <button
                  type="button"
                  onClick={() => setUnreadOnly((prev) => !prev)}
                  className={`ml-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition-colors ${
                    unreadOnly
                      ? "bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 border-slate-900 dark:border-sky-400"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  안읽음만
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0 border-l border-slate-200 dark:border-slate-800 pl-2">
                {(
                  [
                    { id: "ALL", label: "전체 출처" },
                    { id: "SEC", label: "SEC 공시" },
                    { id: "PRESS", label: "보도자료" },
                    { id: "NEWS", label: "금융뉴스" },
                  ] as const
                ).map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSelectedSource(src.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                      selectedSource === src.id
                        ? "bg-blue-50 dark:bg-sky-500/20 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-sky-500/30"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Feed Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-3.5 sm:px-4 py-3.5 sm:py-4 space-y-3.5">
        {/* Local Test Control Panel */}
        {!isSupabaseConfigured && (
          <div className="rounded-2xl border border-blue-200 dark:border-sky-800/60 bg-white dark:bg-slate-900 p-3.5 sm:p-4 text-xs text-slate-700 dark:text-slate-300 shadow-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">
                  모바일 최적화 & 실시간 테스트 모드
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  스마트폰 카메라로 QR코드를 스캔해 내 폰에서 바로 열거나 홈 화면에 앱으로 설치할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleLoadRealLiveRss()}
                disabled={livePreviewLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-sky-500 hover:bg-blue-700 dark:hover:bg-sky-400 active:scale-[0.98] px-3.5 py-2.5 text-xs font-bold text-white dark:text-slate-950 transition-all disabled:opacity-60"
              >
                <Globe
                  className={`h-3.5 w-3.5 ${livePreviewLoading ? "animate-spin" : ""}`}
                />
                <span>
                  {livePreviewLoading
                    ? "실시간 피드 수신 중..."
                    : "실제 실시간 SEC·뉴스 불러오기"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMobileModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-3.5 py-2.5 text-xs font-bold text-white transition-all"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>스마트폰 QR 접속·앱 설치</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateIncoming}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 active:scale-[0.98] border border-blue-200 dark:border-slate-700 px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-sky-300 transition-all"
              >
                <BellRing className="h-3.5 w-3.5" />
                <span>속보 테스트</span>
              </button>
            </div>
          </div>
        )}

        {/* Interactive Watchlist Management Bar */}
        {selectedTicker === "WATCHLIST" && (
          <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                <span>내 관심종목 ({watchlist.length}개)</span>
              </span>
              <button
                type="button"
                onClick={() => setWatchlistModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>종목 추가·편집</span>
              </button>
            </div>

            {watchlist.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {watchlist.map((t) => {
                  const kr = getKoreanCompanyName(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleWatchlist(t)}
                      title={`${t} 관심종목 해제`}
                      className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 px-2 py-1 text-[11px] font-bold text-slate-900 dark:text-white hover:border-rose-400 transition-colors"
                    >
                      <span>
                        ${t}
                        {kr && kr !== t ? ` ${kr}` : ""}
                      </span>
                      <X className="h-3 w-3 text-slate-400 hover:text-rose-600" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-amber-800 dark:text-amber-300">
                등록된 관심종목이 없습니다. 우측 상단 <strong>&apos;종목 추가·편집&apos;</strong> 버튼을 눌러 원하는 종목을 담아보세요!
              </p>
            )}
          </div>
        )}

        {/* Live New Arrival Banner */}
        {newItemsBannerCount > 0 && (
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setNewItemsBannerCount(0);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <BellRing className="h-3.5 w-3.5 animate-bounce" />
            <span>
              신규 공시·뉴스 {newItemsBannerCount}건이 피드 상단에 추가되었습니다
            </span>
          </button>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchFilings(true)}
              className="shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-700 px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300"
            >
              재시도
            </button>
          </div>
        )}

        {/* Feed Cards */}
        {loading ? (
          <div className="space-y-3.5">
            {[1, 2, 3].map((skeletonId) => (
              <div
                key={skeletonId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-3 shadow-xs"
              >
                <div className="flex justify-between">
                  <div className="h-6 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-6 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800/70" />
                <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5 border border-slate-100 dark:border-slate-800">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-14 px-6 text-center space-y-3 shadow-xs">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {selectedTicker === "WATCHLIST"
                ? "현재 등록된 관심종목의 최근 공시·뉴스 브리핑이 아직 없습니다."
                : "선택한 조건에 해당하는 공시·뉴스 브리핑이 없습니다."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedTicker === "WATCHLIST"
                ? "원하는 종목을 추가로 등록해 두시면 새 공시·뉴스가 올라올 때 자동으로 여기에 모입니다."
                : "필터를 초기화하거나 상단 검색창에서 다른 티커·키워드를 입력해 보세요."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {selectedTicker === "WATCHLIST" && (
                <button
                  type="button"
                  onClick={() => setWatchlistModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition-colors shadow-2xs"
                >
                  <Star className="h-3.5 w-3.5 fill-slate-950" />
                  <span>관심종목 추가·변경하기</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedTicker("ALL");
                  setSelectedSector("ALL");
                  setSelectedSentiment("ALL");
                  setSelectedSource("ALL");
                  setUnreadOnly(false);
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-sky-500 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 transition-colors"
              >
                전체 피드 보기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredItems.map((item) => (
              <FilingCard
                key={item.id || item.unique_id}
                item={item}
                largeText={largeText}
                isWatched={watchlistSet.has(item.ticker.toUpperCase())}
                isBookmarked={bookmarkSet.has(item.unique_id)}
                isRead={readSet.has(item.unique_id)}
                onSelectTicker={(ticker) => setSelectedTicker(ticker)}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleBookmark={handleToggleBookmark}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer (Extra bottom padding on mobile so Fixed Bottom Tab Bar never overlaps) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 pb-24 sm:pb-8 px-4 mt-6">
        <div className="mx-auto max-w-2xl space-y-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>이미지 미수집 · 공식 공시 및 공개 RSS 요약 서비스</span>
          </div>
          <p>
            본 웹앱은 외부 웹사이트의 이미지를 일절 수집·렌더링하지 않으며, 미국 SEC EDGAR 전체 실시간 공시(8-K·Form 4)와
            기업 보도자료(PR Newswire·뉴스룸), 글로벌 금융 뉴스 RSS를 Gemini 2.5 Flash로 번역·요약하고
            모든 카드에 공식 원문 링크를 제공합니다.
          </p>
        </div>
      </footer>

      {/* Thumb-Friendly Mobile Bottom Tab Navigation (`sm:hidden`) */}
      <nav
        aria-label="모바일 하단 메뉴"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 h-14">
          <button
            type="button"
            onClick={() => {
              setSelectedTicker("ALL");
              setSelectedSource("ALL");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              selectedTicker === "ALL" && selectedSource === "ALL"
                ? "text-blue-600 dark:text-sky-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Home className="h-4 w-4" />
            <span>전체피드</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("ALL");
              setSelectedTicker("WATCHLIST");
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              selectedTicker === "WATCHLIST"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Star
              className={`h-4 w-4 ${
                selectedTicker === "WATCHLIST" ? "fill-current" : ""
              }`}
            />
            <span>관심({watchlist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTicker("ALL");
              setSelectedSource((prev) => (prev === "SEC" ? "ALL" : "SEC"));
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              selectedSource === "SEC"
                ? "text-blue-600 dark:text-sky-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>SEC공시</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("ALL");
              setSelectedTicker("BOOKMARKS");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              selectedTicker === "BOOKMARKS"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${
                selectedTicker === "BOOKMARKS" ? "fill-current" : ""
              }`}
            />
            <span>저장({bookmarkedIds.length})</span>
          </button>

          {isInstalledApp ? (
            <button
              type="button"
              onClick={() => setWatchlistModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
            >
              <Settings2 className="h-4 w-4" />
              <span>관심설정</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileModalOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300"
            >
              <Smartphone className="h-4 w-4 text-blue-600 dark:text-sky-400" />
              <span>앱설치·QR</span>
            </button>
          )}
        </div>
      </nav>

      {/* Dedicated Watchlist Search / Add / Remove Modal */}
      <WatchlistModal
        open={watchlistModalOpen}
        watchlist={watchlist}
        onClose={() => setWatchlistModalOpen(false)}
        onToggleTicker={handleToggleWatchlist}
        onClearAll={handleClearWatchlist}
      />

      {/* Mobile QR Connect & Native PWA Install Modal */}
      <MobileInstallModal
        open={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setDeferredPrompt(null)}
      />
    </div>
  );
}
