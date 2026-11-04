"use client";

import { useState } from "react";
import { Check, Flag, Mail, X } from "lucide-react";
import type { FilingItem } from "@/types/filing";

interface AiReportModalProps {
  item: FilingItem | null;
  onClose: () => void;
  onHideItem?: (uniqueId: string) => void;
}

const REPORT_REASONS = [
  "번역 또는 핵심 수치(금액·비율·일정) 오류",
  "호재(Bullish) / 악재(Bearish) 감성 분류 부적절",
  "원문 맥락과 다른 AI 요약(환각·과장 표현)",
  "부적절하거나 불쾌감을 주는 AI 생성 문구",
  "기타 오류 및 개선 의견",
] as const;

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@inniable.dev";

export default function AiReportModal({
  item,
  onClose,
  onHideItem,
}: AiReportModalProps) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState<string>("");
  const [hideFromFeed, setHideFromFeed] = useState<boolean>(true);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existingRaw = localStorage.getItem("sb_ai_reports_v1");
      const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
      const next = [
        {
          unique_id: item.unique_id,
          ticker: item.ticker,
          reason,
          detail: detail.trim(),
          reported_at: new Date().toISOString(),
        },
        ...existing,
      ].slice(0, 100);
      localStorage.setItem("sb_ai_reports_v1", JSON.stringify(next));
    } catch {
      // Ignore localStorage quota errors
    }

    if (hideFromFeed) {
      onHideItem?.(item.unique_id);
    }
    setSubmitted(true);
  };

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `[AI 요약 신고] $${item.ticker} - ${item.unique_id}`
  )}&body=${encodeURIComponent(
    [
      `종목/티커: $${item.ticker} (${item.company_name})`,
      `문서 ID: ${item.unique_id}`,
      `AI 제목: ${item.headline_kr}`,
      `원문 링크: ${item.source_url}`,
      `신고 사유: ${reason}`,
      `상세 내용: ${detail.trim() || "(없음)"}`,
    ].join("\n")
  )}`;

  const handleClose = () => {
    setSubmitted(false);
    setDetail("");
    setReason(REPORT_REASONS[0]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                AI 생성 요약 오류·부적절 콘텐츠 신고
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ${item.ticker} · 생성형 AI 품질 관리 및 즉시 숨김
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 p-4 text-xs leading-relaxed text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-sm">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>신고가 정상 접수되었습니다</span>
              </div>
              <p>
                {hideFromFeed
                  ? "해당 AI 요약 카드가 내 피드에서 즉시 숨김 처리되었습니다."
                  : "신고 내역이 기록되었습니다."}{" "}
                담당자에게 이메일로 상세 내용을 함께 전달하시려면 아래 버튼을 눌러주세요.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={mailtoHref}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-sky-500 py-2.5 px-4 text-xs font-extrabold text-white dark:text-slate-950 text-center"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>담당자에게 이메일 전송 (선택)</span>
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 px-4 text-xs font-extrabold text-slate-700 dark:text-slate-200"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 line-clamp-2 font-semibold">
              {item.headline_kr}
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                신고 사유 선택
              </legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                    reason === r
                      ? "bg-rose-50/70 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-200"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="ai-report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-rose-600"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </fieldset>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                추가 메모 (선택)
              </label>
              <textarea
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="오역된 부분이나 원문과 다른 수치가 있다면 적어주세요."
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hideFromFeed}
                onChange={(e) => setHideFromFeed(e.target.checked)}
                className="accent-rose-600 rounded"
              />
              <span>신고 후 내 브리핑 피드에서 이 카드 즉시 숨기기</span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-3 text-xs font-extrabold text-slate-700 dark:text-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-extrabold text-white shadow-xs transition-colors"
              >
                신고 접수하기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
