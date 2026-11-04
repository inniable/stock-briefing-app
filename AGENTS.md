# Project Rules & Constraints

1. **No Image Scraping:** 절대 외부 웹사이트의 `<img>` 태그나 `og:image` 썸네일을 수집하거나 화면에 렌더링하지 마라. 시각적 요소는 오직 기업 티커 심볼 텍스트와 호재/악재 컬러 배지(Badge), 아이콘으로만 표현한다.
2. **Database Security:**
   - 수집기(`/collector`)는 쓰기 권한이 필요하므로 `SUPABASE_SERVICE_ROLE_KEY`를 사용한다.
   - 프론트엔드(`/web`)는 읽기 전용이므로 반드시 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 사용하며, Supabase RLS(Row Level Security)에서 `SELECT`만 전체 허용(`true`)하는 SQL 정책을 포함한다.
3. **LLM SDK Standard:** 구버전인 `google-generativeai` 패키지를 쓰지 말고, 반드시 최신 공식 SDK인 `google-genai` (`from google import genai`) 문법을 사용하라.
4. **Error Resilience:** 특정 기업의 RSS 피드 하나가 접속 오류(Timeout 등)를 일으켜도 전체 GitHub Actions 작업이 멈추지 않도록 개별 피드 루프마다 `try-except` 블록으로 감싸고 에러 로그만 출력한 뒤 다음 기업으로 넘어가라.
