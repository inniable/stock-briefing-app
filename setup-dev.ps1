# ============================================================================
# US 공시·뉴스 AI 브리핑 - 새 PC / 집 노트북 원클릭 개발환경 세팅 스크립트 (Windows)
# 실행 방법 (PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\setup-dev.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " US 공시·뉴스 브리핑 - 개발환경 자동 세팅 (Windows)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. 환경변수 로드 (laptop-env-backup.txt 우선 탐색 -> 없으면 .env 탐색 -> 없으면 대화형 입력)
$EnvMap = @{}
$BackupFile = Join-Path $RootDir "laptop-env-backup.txt"
$RootEnvFile = Join-Path $RootDir ".env"

$SourceFile = $null
if (Test-Path $BackupFile) {
    $SourceFile = $BackupFile
    Write-Host "[1/3] laptop-env-backup.txt 파일을 감지했습니다. 키를 자동 복원합니다..." -ForegroundColor Green
} elseif (Test-Path $RootEnvFile) {
    $SourceFile = $RootEnvFile
    Write-Host "[1/3] 기존 .env 파일을 감지했습니다..." -ForegroundColor Green
}

if ($SourceFile) {
    Get-Content $SourceFile -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $idx = $line.IndexOf("=")
            $k = $line.Substring(0, $idx).Trim()
            $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
            if ($k -and $v) {
                $EnvMap[$k] = $v
            }
        }
    }
}

function Prompt-IfMissing([string]$Key, [string]$Label, [string]$DefaultVal = "") {
    if (-not $EnvMap.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($EnvMap[$Key])) {
        if ($DefaultVal) {
            $inputVal = Read-Host "$Label (기본값: $DefaultVal)"
            $EnvMap[$Key] = if ([string]::IsNullOrWhiteSpace($inputVal)) { $DefaultVal } else { $inputVal.Trim() }
        } else {
            $inputVal = Read-Host "$Label 입력"
            if (-not [string]::IsNullOrWhiteSpace($inputVal)) {
                $EnvMap[$Key] = $inputVal.Trim()
            }
        }
    }
}

Prompt-IfMissing "SUPABASE_URL" "SUPABASE_URL (예: https://xxxx.supabase.co)"
Prompt-IfMissing "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public 키)"
Prompt-IfMissing "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_ROLE_KEY (service_role 키, 웹만 실행 시 Enter 생략 가능)"
Prompt-IfMissing "GEMINI_API_KEY" "GEMINI_API_KEY (수집기 로컬 테스트용, 웹만 실행 시 Enter 생략 가능)"
Prompt-IfMissing "SEC_USER_AGENT" "SEC_USER_AGENT" "StockBriefingApp admin@inniable.dev"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# 루트 .env 작성
$RootLines = @(
    "SUPABASE_URL=$($EnvMap['SUPABASE_URL'])",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($EnvMap['NEXT_PUBLIC_SUPABASE_ANON_KEY'])",
    "SUPABASE_SERVICE_ROLE_KEY=$($EnvMap['SUPABASE_SERVICE_ROLE_KEY'])",
    "GEMINI_API_KEY=$($EnvMap['GEMINI_API_KEY'])",
    "SEC_USER_AGENT=$($EnvMap['SEC_USER_AGENT'])"
)
[System.IO.File]::WriteAllLines($RootEnvFile, $RootLines, $Utf8NoBom)

# web/.env.local 작성
$WebEnvFile = Join-Path $RootDir "web\.env.local"
$WebLines = @(
    "NEXT_PUBLIC_SUPABASE_URL=$($EnvMap['SUPABASE_URL'])",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($EnvMap['NEXT_PUBLIC_SUPABASE_ANON_KEY'])"
)
[System.IO.File]::WriteAllLines($WebEnvFile, $WebLines, $Utf8NoBom)
Write-Host "  -> .env 및 web/.env.local 생성 완료!" -ForegroundColor Green

# 2. Next.js 프론트엔드 패키지 설치
Write-Host ""
Write-Host "[2/3] 프론트엔드(web) npm 패키지 설치 중..." -ForegroundColor Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Push-Location (Join-Path $RootDir "web")
    npm install
    Pop-Location
    Write-Host "  -> web 패키지 설치 완료!" -ForegroundColor Green
} else {
    Write-Host "  [경고] Node.js(npm)가 설치되어 있지 않습니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요." -ForegroundColor Yellow
}

# 3. Python 수집기 가상환경 설치 (선택)
Write-Host ""
Write-Host "[3/3] Python 수집기(collector) 가상환경 확인 중..." -ForegroundColor Cyan
if (Get-Command python -ErrorAction SilentlyContinue) {
    $VenvDir = Join-Path $RootDir ".venv"
    if (-not (Test-Path $VenvDir)) {
        python -m venv $VenvDir
    }
    $VenvPip = Join-Path $VenvDir "Scripts\pip.exe"
    if (Test-Path $VenvPip) {
        & $VenvPip install -q -r (Join-Path $RootDir "collector\requirements.txt")
        Write-Host "  -> Python .venv 및 collector 패키지 설치 완료!" -ForegroundColor Green
    }
} else {
    Write-Host "  [안내] Python이 없어도 웹앱 개발 및 GitHub Actions 자동 수집/APK 빌드는 정상 작동합니다." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host " 세팅 완료! 아래 명령어로 로컬 웹 서버를 실행하세요:" -ForegroundColor Green
Write-Host "   cd web; npm run dev" -ForegroundColor Yellow
Write-Host "   접속 주소: http://localhost:3000" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Green
