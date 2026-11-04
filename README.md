# US 빅테크 공식 공시(SEC EDGAR) · 뉴스룸 실시간 AI 브리핑 PWA

저작권 분쟁 위험이 전혀 없는(**Zero Copyright Risk**) 1차 원본 데이터(미국 SEC EDGAR 공식 Atom 피드 & M7 빅테크 공식 뉴스룸 RSS)만을 수집하여, **Gemini 2.5 Flash**로 실시간 한글 번역·감성 분석·3줄 요약해 제공하는 **운영비 0원(Zero-cost Serverless)** 모노레포 웹앱입니다.

---

## 1. 시스템 아키텍처 & 폴더 구조

```text
newsapp/
├── .env.example                        # 로컬 개발용 환경변수 템플릿
├── .github/
│   └── workflows/
│       └── cron_collector.yml          # 10분 주기 자동 실행 & 수동 실행(workflow_dispatch) 스케줄러
├── supabase/
│   └── schema.sql                      # filings_feed 단일 테이블, 인덱스, RLS 보안 정책, Realtime 설정
├── collector/
│   ├── collector.py                    # SEC/뉴스룸 수집 · 중복 차단 · HTML 정제 · Gemini 2.5 요약 파이프라인
│   ├── feeds_config.json               # M7 빅테크 SEC 8-K Atom 피드 & 공식 뉴스룸 RSS 목록
│   └── requirements.txt                # Python 3.11 의존성 목록
└── web/                                # Next.js (App Router) + Tailwind CSS + Supabase Realtime 모바일 PWA
    ├── public/
    │   ├── icon.svg                    # PWA 벡터 앱 아이콘
    │   └── sw.js                       # 모바일 홈 화면 추가(PWA) 지원 Service Worker
    └── src/
        ├── app/                        # App Router 레이아웃, PWA Manifest, 메인 페이지
        ├── components/                 # FeedClient (실시간 피드/필터), FilingCard (요약 카드)
        ├── lib/supabase.ts             # Supabase 클라이언트
        └── types/filing.ts             # 스키마 타입 및 미연결 시 데모 프리뷰 데이터
```

### 핵심 설계 원칙
1. **저작권 안전성 100% 확보:** 언론사 기사를 일절 크롤링하지 않으며, 이미지·썸네일도 수집/저장하지 않습니다. 모든 요약 카드 하단에 공식 원문 아웃링크(`source_url`) 버튼을 필수로 제공합니다.
2. **SEC EDGAR 차단 방지 준수:** `SEC_USER_AGENT` 헤더(`AppName AdminContact@domain.com` 형식) 강제 주입, 요청 간 `time.sleep(0.2)` 딜레이(초당 10회 미만 준수), 지수 백오프 재시도(Retry) 로직이 내장되어 있습니다.
3. **LLM 비용 및 토큰 절감:** RSS 항목 파싱 직후 Supabase `unique_id` 중복 여부를 먼저 조회하여 이미 수집된 문서는 본문 요청 및 Gemini API 호출 없이 즉시 건너뜁니다(`continue`). 신규 문서만 `<script>`, `<style>`, `<nav>`, `<footer>` 제거 후 앞 **15,000자**까지만 잘라 `gemini-2.5-flash`에 전달합니다.

---

## 2. 배포 및 연결 순서 (Step-by-Step)

### Step 1. Supabase 프로젝트 생성 및 DB 스키마 적용
1. [Supabase Dashboard](https://supabase.com/dashboard)에서 무료(Free Tier) 프로젝트를 생성합니다.
2. 좌측 메뉴 **SQL Editor** → **New query**를 클릭합니다.
3. 이 저장소의 [`supabase/schema.sql`](./supabase/schema.sql) 전체 내용을 복사해 붙여넣고 **Run**을 실행합니다.
   - `public.filings_feed` 테이블, 조회 인덱스, 익명 읽기 전용 RLS 정책, `supabase_realtime` 실시간 구독 설정이 한 번에 완료됩니다.
4. **Project Settings → API** 메뉴에서 아래 3가지 값을 복사해 둡니다:
   - `Project URL` (`SUPABASE_URL`)
   - `anon public` 키 (`NEXT_PUBLIC_SUPABASE_ANON_KEY` — 프론트엔드용)
   - `service_role secret` 키 (`SUPABASE_SERVICE_ROLE_KEY` — 백엔드 수집기 전용, 외부 노출 금지)

---

### Step 2. Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com/)에서 무료 API 키(`GEMINI_API_KEY`)를 발급받습니다.

---

### Step 3. GitHub 저장소 Push 및 GitHub Actions Secrets 등록
1. 이 프로젝트를 본인의 GitHub 저장소에 Push합니다.
2. GitHub 저장소 상단 **Settings → Secrets and variables → Actions → New repository secret**에서 아래 4개 시크릿을 등록합니다:

| Secret 이름 | 설명 및 예시 값 |
| :--- | :--- |
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` 시크릿 키 |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API 키 |
| `SEC_USER_AGENT` | `StockBriefingApp your-email@domain.com` *(반드시 앱이름 + 이메일 형식)* |

3. GitHub 저장소 상단 **Actions** 탭으로 이동해 **`Real-Time SEC & Big Tech Newsroom Collector`** 워크플로우를 선택하고 **Run workflow** 버튼을 눌러 첫 수동 수집을 테스트합니다.
   - 이후에는 10분마다(`*/10 * * * *`) 자동으로 신규 공시와 공식 뉴스룸 발표를 수집합니다.

---

### Step 4. 프론트엔드(`/web`) Vercel 무료 배포 및 PWA 설치
1. [Vercel](https://vercel.com/)에 로그인 후 **Add New Project** → GitHub 저장소를 선택합니다.
2. **Root Directory** 항목에서 `Edit`을 눌러 **`web`**으로 지정합니다.
3. **Environment Variables** 섹션에 아래 2개 변수를 추가합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://xxxxxxxxxxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase `anon public` 키
4. **Deploy**를 클릭하면 배포가 완료됩니다.
5. 스마트폰 브라우저(iOS Safari 공유 버튼 → **홈 화면에 추가**, Android Chrome 메뉴 → **앱 설치/홈 화면에 추가**)로 접속하면 네이티브 앱처럼 전체화면 다크모드 PWA로 사용할 수 있습니다.

---

## 3. 로컬 개발 및 테스트 방법

### Python 수집기 로컬 실행 (`/collector`)
```bash
# 1. 루트 경로에 .env 생성 후 값 입력
cp .env.example .env

# 2. 가상환경 생성 및 패키지 설치 (Python 3.11 권장)
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

pip install -r collector/requirements.txt

# 3. 수집기 1회 실행
python collector/collector.py
```

### Next.js 웹 프론트엔드 로컬 실행 (`/web`)
```bash
cd web
cp .env.example .env.local
# .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력

npm install
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속해 반응형 다크모드 피드, 티커별 필터(`$NVDA`, `$AAPL`, `$MSFT` 등), 호재/악재 배지 및 원문 이동 버튼을 확인할 수 있습니다.


---

## 4. 스마트폰 설치용 Android `.apk` 빌드 및 배포 방법

현재 저장소에는 로컬 Android Studio(약 6GB) 설치 없이도 **GitHub Actions 무료 서버에서 서명된(Signed) 설치용 `.apk` 파일을 자동 생성하고 배포 링크까지 만들어주는 파이프라인**이 내장되어 있습니다.

### 방법 A. GitHub Actions로 `.apk` 자동 생성 및 폰에 바로 설치 (권장 · 무설치)
1. 이 프로젝트 전체를 본인의 GitHub 저장소에 `git push` 합니다.
2. (선택) 실서버 Supabase 연동 시 GitHub 저장소 **Settings → Secrets and variables → Actions**에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가로 등록합니다 (`SUPABASE_URL`은 수집기와 공유).
3. GitHub 저장소 상단 **Actions** 탭 → 좌측 **`Build Installable Android APK`** 클릭 → 우측 **`Run workflow`** 버튼을 클릭합니다.
4. 약 3~4분 후 빌드가 완료되면 저장소 우측 **Releases (`latest-apk`)** 페이지에 **`StockBriefing-Android.apk`** 파일이 자동 게시됩니다.
5. 안드로이드 스마트폰(갤럭시 등) 브라우저나 카카오톡으로 해당 Release 링크를 열어 **`StockBriefing-Android.apk`**를 내려받고 터치하면 즉시 **`공시브리핑`** 네이티브 앱으로 설치됩니다.

### 방법 B. 로컬 PC(Android Studio)에서 직접 `.apk` 빌드 시
PC에 JDK 17 및 Android Studio(Android SDK API 34)가 설치되어 있다면 아래 명령어로 로컬에서도 동일하게 빌드할 수 있습니다:
```bash
cd web
npm run build:apk
cd android
./gradlew assembleRelease
```
