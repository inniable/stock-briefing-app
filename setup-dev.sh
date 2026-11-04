#!/usr/bin/env bash
# ============================================================================
# US 공시·뉴스 AI 브리핑 - 새 PC / 집 노트북 원클릭 개발환경 세팅 스크립트 (macOS / Linux)
# 실행 방법:
#   bash ./setup-dev.sh
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo ""
echo "======================================================"
echo " US 공시·뉴스 브리핑 - 개발환경 자동 세팅 (macOS/Linux)"
echo "======================================================"

BACKUP_FILE="$ROOT_DIR/laptop-env-backup.txt"
ROOT_ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$BACKUP_FILE" ]]; then
  echo "[1/3] laptop-env-backup.txt 파일을 감지하여 .env를 복원합니다..."
  cp "$BACKUP_FILE" "$ROOT_ENV_FILE"
elif [[ ! -f "$ROOT_ENV_FILE" ]]; then
  read -r -p "SUPABASE_URL: " SUPABASE_URL_IN
  read -r -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " ANON_KEY_IN
  read -r -p "SUPABASE_SERVICE_ROLE_KEY (선택): " SERVICE_KEY_IN
  read -r -p "GEMINI_API_KEY (선택): " GEMINI_KEY_IN
  cat > "$ROOT_ENV_FILE" <<EOF
SUPABASE_URL=${SUPABASE_URL_IN}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY_IN}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY_IN}
GEMINI_API_KEY=${GEMINI_KEY_IN}
SEC_USER_AGENT=StockBriefingApp admin@inniable.dev
EOF
fi

SUPABASE_URL_VAL="$(grep -E '^SUPABASE_URL=' "$ROOT_ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\r')"
ANON_KEY_VAL="$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ROOT_ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\r')"

cat > "$ROOT_DIR/web/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL_VAL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY_VAL}
EOF
echo "  -> .env 및 web/.env.local 생성 완료!"

echo ""
echo "[2/3] 프론트엔드(web) npm 패키지 설치 중..."
if command -v npm >/dev/null 2>&1; then
  (cd "$ROOT_DIR/web" && npm install)
  echo "  -> web 패키지 설치 완료!"
else
  echo "  [경고] Node.js(npm)가 설치되어 있지 않습니다."
fi

echo ""
echo "[3/3] Python 수집기(collector) 가상환경 확인 중..."
if command -v python3 >/dev/null 2>&1; then
  python3 -m venv "$ROOT_DIR/.venv"
  "$ROOT_DIR/.venv/bin/pip" install -q -r "$ROOT_DIR/collector/requirements.txt"
  echo "  -> Python .venv 및 collector 패키지 설치 완료!"
fi

echo ""
echo "세팅 완료! 실행 명령어: cd web && npm run dev (http://localhost:3000)"
