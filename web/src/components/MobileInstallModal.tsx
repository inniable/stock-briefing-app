"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  QrCode,
  Share,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface MobileInstallModalProps {
  open: boolean;
  onClose: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled?: () => void;
}

interface MobileAccessPayload {
  primaryUrl: string;
  lanUrl: string;
  tunnelUrl: string | null;
  qrSvg: string;
}

const DIRECT_APK_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ||
  "https://github.com/inniable/stock-briefing-app/releases/download/latest-apk/StockBriefing-Android.apk";

export default function MobileInstallModal({
  open,
  onClose,
  deferredPrompt,
  onInstalled,
}: MobileInstallModalProps) {
  const [data, setData] = useState<MobileAccessPayload | null>(null);
  const [selectedMode, setSelectedMode] = useState<"apk" | "primary" | "lan">(
    "apk"
  );
  const [copied, setCopied] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);
    if (ios) {
      setSelectedMode("primary");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const loadQr = async () => {
      try {
        const ua =
          typeof window !== "undefined"
            ? window.navigator.userAgent.toLowerCase()
            : "";
        const ios = /iphone|ipad|ipod/.test(ua);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isPublicOrigin =
          origin.startsWith("https://") && !origin.includes("localhost");

        const targetForInitialQr = ios
          ? isPublicOrigin
            ? origin
            : ""
          : DIRECT_APK_DOWNLOAD_URL;

        const endpoint = targetForInitialQr
          ? `/api/mobile-access?url=${encodeURIComponent(targetForInitialQr)}`
          : "/api/mobile-access";

        const res = await fetch(endpoint);
        if (!res.ok) return;
        const json = (await res.json()) as MobileAccessPayload;
        setData(json);
      } catch {
        // Ignore fetch errors
      }
    };

    void loadQr();
  }, [open]);

  const handleModeSwitch = async (mode: "apk" | "primary" | "lan") => {
    setSelectedMode(mode);
    if (!data) return;
    const targetUrl =
      mode === "apk"
        ? DIRECT_APK_DOWNLOAD_URL
        : mode === "lan"
          ? data.lanUrl
          : data.tunnelUrl || data.lanUrl;
    try {
      const res = await fetch(
        `/api/mobile-access?url=${encodeURIComponent(targetUrl)}`
      );
      if (res.ok) {
        const updated = (await res.json()) as MobileAccessPayload;
        setData((prev) =>
          prev
            ? {
                ...prev,
                primaryUrl: updated.primaryUrl,
                qrSvg: updated.qrSvg,
              }
            : updated
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      onInstalled?.();
      onClose();
    }
  };

  const handleCopyUrl = async () => {
    const urlToCopy =
      selectedMode === "apk"
        ? DIRECT_APK_DOWNLOAD_URL
        : selectedMode === "lan"
          ? data?.lanUrl
          : data?.tunnelUrl || data?.primaryUrl;
    if (!urlToCopy) return;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (!open) return null;

  const activeUrl =
    selectedMode === "apk"
      ? DIRECT_APK_DOWNLOAD_URL
      : selectedMode === "lan"
        ? data?.lanUrl ?? ""
        : data?.tunnelUrl || data?.lanUrl || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                스마트폰 APK 다운로드 & 앱 설치
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                갤럭시 Android APK 직접 설치 및 아이폰 PWA 추가 지원
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

        {/* Already Installed Badge */}
        {isStandalone && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>현재 스마트폰 앱 모드로 실행 중입니다!</span>
          </div>
        )}

        {/* Direct Android APK Download Button */}
        {!isIos && (
          <a
            href={DIRECT_APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] py-3.5 px-4 text-sm font-extrabold text-white shadow-md transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Android 설치 파일 다운로드 (StockBriefing.apk)</span>
          </a>
        )}

        {/* 1-Tap Android / Chrome Native PWA Install Button */}
        {deferredPrompt && !isStandalone && (
          <button
            type="button"
            onClick={() => void handleNativeInstall()}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] py-3 px-4 text-xs font-extrabold text-white shadow-sm transition-all"
          >
            <Smartphone className="h-4 w-4" />
            <span>웹 브라우저 홈 화면 바로가기(PWA)로 추가</span>
          </button>
        )}

        {/* Vector SVG QR Code Card for Instant Camera Scan */}
        {data && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center text-center space-y-3">
            <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => void handleModeSwitch("apk")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  selectedMode === "apk"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Android APK 직접 설치
              </button>
              {data.tunnelUrl && (
                <button
                  type="button"
                  onClick={() => void handleModeSwitch("primary")}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
                    selectedMode === "primary"
                      ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  모바일 웹 (LTE/5G)
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleModeSwitch("lan")}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  selectedMode === "lan"
                    ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                동일 Wi-Fi 웹 접속
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <QrCode className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {selectedMode === "apk"
                  ? "갤럭시 카메라로 스캔하면 APK 설치 파일이 바로 다운로드됩니다"
                  : "스마트폰 기본 카메라로 스캔해 바로 열기"}
              </span>
            </div>

            {/* Pure Inline Vector SVG QR Code (Zero <img> tags) */}
            <div
              className="rounded-2xl bg-white p-3 border border-slate-200 shadow-xs"
              dangerouslySetInnerHTML={{ __html: data.qrSvg }}
            />

            <div className="w-full flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2">
              <Wifi className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate flex-1 text-left">
                {activeUrl}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>주소 복사</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* iOS & Android Home Screen Add Guide */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 text-xs">
          <p className="font-extrabold text-slate-900 dark:text-white">
            {isIos
              ? "아이폰(Safari) 홈 화면 앱 추가 방법"
              : "스마트폰 홈 화면 앱 설치 안내"}
          </p>
          <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 dark:bg-sky-500 text-[11px] font-bold text-white dark:text-slate-950">
                1
              </span>
              <span>
                <strong>iPhone (Safari):</strong> 하단 중앙의{" "}
                <strong className="inline-flex items-center gap-0.5 text-blue-600 dark:text-sky-400">
                  <Share className="h-3 w-3 inline" /> 공유 버튼
                </strong>{" "}
                터치 → <strong>&apos;홈 화면에 추가&apos;</strong> 선택
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 dark:bg-sky-500 text-[11px] font-bold text-white dark:text-slate-950">
                2
              </span>
              <span>
                <strong>Galaxy / Android (Chrome):</strong> 우측 상단 메뉴(⋮) 터치 →{" "}
                <strong>&apos;앱 설치&apos;</strong> 또는{" "}
                <strong>&apos;홈 화면에 추가&apos;</strong> 선택
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
