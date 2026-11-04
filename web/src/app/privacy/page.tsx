import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle, Mail, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "개인정보처리방침 및 이용·면책 고지 | US 공시·뉴스 AI 브리핑",
  description:
    "US 공시·뉴스 AI 브리핑(공시브리핑) 앱 및 웹 서비스의 개인정보처리방침, 데이터 처리 안내, 투자 유의 및 생성형 AI 면책 고지",
};

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@inniable.dev";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>브리핑 피드로 돌아가기</span>
          </Link>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            시행일: 2026-11-04
          </span>
        </div>

        <header className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Google Play 개인정보 보호 및 데이터 안전 준수</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            개인정보처리방침 및 서비스 면책 고지
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong>공시브리핑 (US 공시·뉴스 AI 브리핑, 패키지명: com.stockbriefing.app)</strong>은
            별도의 회원가입이나 로그인 없이 이용할 수 있으며, 이용자의 개인정보를 외부 서버에 수집·저장·판매하지 않습니다.
          </p>
        </header>

        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600 dark:text-sky-400" />
              <span>1. 수집하는 개인정보 항목 및 처리 방식</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                <strong>개인식별정보 미수집:</strong> 본 앱은 이름, 이메일, 전화번호, 위치정보, 연락처, 광고 식별자(ADID) 등 어떠한 개인식별정보도 요구하거나 서버로 전송하지 않습니다.
              </li>
              <li>
                <strong>기기 내 로컬 저장 데이터:</strong> 이용자가 설정한 관심종목 목록, 북마크, 읽음 표시, 화면 테마(다크모드/글자 크기), 숨김 신고 항목은 오직 이용자 스마트폰/브라우저 내부 저장소(<code>localStorage</code>)에만 저장되며 외부로 전송되지 않습니다.
              </li>
              <li>
                <strong>네트워크 통신 로그:</strong> 공개된 공시·보도자료 요약 피드를 불러오기 위해 데이터베이스(Supabase 읽기 전용 API) 및 공개 RSS/SEC EDGAR 서버와 HTTPS 암호화 통신을 수행합니다.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              2. 데이터 보관 및 삭제 방법
            </h2>
            <p className="text-xs sm:text-sm">
              서버에 저장되는 이용자 계정 정보가 없으므로 별도의 회원 탈퇴 절차가 필요하지 않습니다. 기기에 저장된 관심종목·북마크 설정을 초기화하려면 앱 내 관심종목 설정에서 전체 해제를 누르거나, Android 기기 <strong>설정 → 애플리케이션 → 공시브리핑 → 저장공간 → 데이터 삭제</strong>(또는 앱 삭제)를 수행하면 즉시 영구 삭제됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              3. 외부 원문 링크 및 제3자 사이트 안내
            </h2>
            <p className="text-xs sm:text-sm">
              모든 브리핑 카드 하단의 <strong>&apos;SEC 공시 원문&apos;, &apos;보도자료 원문&apos;, &apos;뉴스 원문 보기&apos;</strong> 버튼을 누르면 미국 증권거래위원회(SEC EDGAR) 또는 각 발행사의 공식 외부 웹사이트가 기기 기본 브라우저로 열립니다. 외부 웹사이트 방문 시에는 해당 사이트의 개인정보처리방침이 적용됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              4. 앱 접근 권한 안내
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>
                <strong>인터넷 연결 (<code>android.permission.INTERNET</code>):</strong> 실시간 공시 및 공식 뉴스 요약 데이터를 수신하기 위한 필수 권한입니다.
              </li>
              <li>카메라, 마이크, 위치, 저장소, 연락처 등 민감한 기기 권한은 일절 요청하지 않습니다.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 p-6 shadow-xs space-y-3 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <h2 className="text-base font-extrabold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>5. 투자 유의사항 및 생성형 AI 요약 면책 고지</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>투자 자문 아님:</strong> 본 앱에서 제공하는 모든 한글 번역, 3줄 요약, 핵심 수치 태그 및 <strong>호재(Bullish)·악재(Bearish)·중립(Neutral)</strong> 감성 분류는 공개된 원문 공시·보도자료의 빠른 파악을 돕기 위한 단순 참고 자료이며, 특정 증권이나 금융상품의 매수·매도 권유 또는 투자 자문이 아닙니다.
            </li>
            <li>
              <strong>생성형 AI 한계 고지:</strong> 요약 및 감성 분류는 생성형 AI(Google Gemini)가 자동 생성하므로 번역 오차, 수치 누락 또는 맥락 해석 오류가 발생할 수 있습니다. 실제 투자 의사결정 전 반드시 카드 하단의 공식 원문 링크를 직접 확인하시기 바라며, 투자에 따른 모든 손익과 책임은 이용자 본인에게 귀속됩니다.
            </li>
            <li>
              <strong>AI 콘텐츠 오류 신고:</strong> 부정확하거나 부적절한 AI 요약 문구를 발견하신 경우 각 카드 하단의 <strong>&apos;AI 신고&apos;</strong> 버튼을 통해 즉시 신고 및 숨김 처리할 수 있습니다.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-blue-600 dark:text-sky-400" />
            <span>6. 개인정보 보호 및 서비스 문의처</span>
          </h2>
          <p>
            서비스 이용, 개인정보 보호 관련 문의 또는 AI 요약 오류 제보는 아래 연락처로 문의해 주시기 바랍니다.
          </p>
          <p className="font-mono font-bold text-slate-900 dark:text-white pt-1">
            이메일:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[공시브리핑 문의]")}`}
              className="text-blue-600 dark:text-sky-400 underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
