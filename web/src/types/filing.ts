export type SentimentType = "Bullish" | "Bearish" | "Neutral";
export type SourceType = "SEC" | "PRESS" | "NEWS";

export interface FilingItem {
  id: string;
  unique_id: string;
  ticker: string;
  company_name: string;
  source_type: SourceType;
  filing_type: string;
  original_title: string;
  headline_kr: string;
  sentiment: SentimentType;
  summary_lines: string[];
  key_numbers: string[];
  source_url: string;
  published_at: string;
  created_at: string;
}

export const DEFAULT_QUICK_TICKERS = [
  "ALL",
  "MARKET",
  "NVDA",
  "LLY",
  "JPM",
  "PLTR",
  "AMD",
  "AAPL",
  "COST",
  "XOM",
  "TSLA",
] as const;

export const DEMO_FILINGS: FilingItem[] = [
  {
    id: "demo-market-1",
    unique_id: "yahoo-market-macro-1",
    ticker: "MARKET",
    company_name: "Yahoo Finance",
    source_type: "NEWS",
    filing_type: "Market News",
    original_title:
      "US Treasury yields ease as core inflation cools in line with Wall Street estimates",
    headline_kr:
      "미 근원 물가지표 예상치 부합에 국채 금리 안정세… S&P 500·나스닥 상승 출발",
    sentiment: "Bullish",
    summary_lines: [
      "미국 주요 물가 지표가 월가 컨센서스에 부합하며 연준의 통화정책 완화 기조 유지 기대감이 확산됨",
      "10년물 미 국채 금리가 하락 안정세를 보이며 성장주·반도체·금융 섹터 전반에 매수세가 유입됨",
      "야후 파이낸스 집계 결과 S&P 500 내 11개 업종 중 9개 업종이 장 초반 강세를 기록 중임",
    ],
    key_numbers: ["미 10년물 금리 안정", "S&P 500 상승세", "9/11 섹터 강세"],
    source_url: "https://finance.yahoo.com/",
    published_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "demo-lly-1",
    unique_id: "prnewswire-lly-glp1",
    ticker: "LLY",
    company_name: "Eli Lilly · PR Newswire",
    source_type: "PRESS",
    filing_type: "Press Wire",
    original_title:
      "Eli Lilly announces positive Phase 3 topline clinical results and manufacturing capacity expansion",
    headline_kr:
      "Eli Lilly(일라이 릴리), 차세대 대사질환 치료제 임상 3상 주요 평가지표 달성 발표",
    sentiment: "Bullish",
    summary_lines: [
      "글로벌 보도자료 배포망(PR Newswire)을 통해 경구용 차세대 대사질환 파이프라인 임상 3상 톱라인 성공 발표",
      "위약군 대비 통계적으로 유의미한 체중 감소 및 혈당 개선 효과를 입증했으며 중대한 안전성 이슈가 관찰되지 않음",
      "늘어나는 글로벌 처방 수요에 대응하기 위해 인디애나주 신규 생산공장 증설 투자도 병행 추진함",
    ],
    key_numbers: ["임상 3상 톱라인 달성", "연내 FDA 허가 신청", "신규 공장 증설"],
    source_url: "https://www.prnewswire.com/",
    published_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "demo-jpm-1",
    unique_id: "0000019617-26-000112",
    ticker: "JPM",
    company_name: "JPMorgan Chase & Co.",
    source_type: "SEC",
    filing_type: "8-K",
    original_title:
      "8-K - JPMORGAN CHASE & CO (0000019617) (Filer) - Item 2.02 Results of Operations",
    headline_kr:
      "JPMorgan Chase, IB 수수료 및 순이자이익 호조로 분기 어닝 서프라이즈 SEC 8-K 공시",
    sentiment: "Bullish",
    summary_lines: [
      "SEC Form 8-K(Item 2.02)를 통해 시장 예상치를 상회하는 분기 매출 및 주당순이익(EPS) 실적을 공식 보고함",
      "기업 인수합병(M&A) 자문 및 채권 발행 주관 증가로 투자은행(IB) 부문 수수료 수익이 크게 반등함",
      "보통주자본비율(CET1)을 규제 기준 대비 여유 있게 유지하며 분기 배당 및 자사주 매입을 지속함",
    ],
    key_numbers: ["Form 8-K (Item 2.02)", "IB 수수료 YoY +29%", "CET1 비율 15.3%"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000019617&type=8-K",
    published_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
  },
  {
    id: "demo-pltr-1",
    unique_id: "0001321655-26-000038",
    ticker: "PLTR",
    company_name: "Palantir Technologies Inc.",
    source_type: "SEC",
    filing_type: "8-K",
    original_title:
      "8-K - PALANTIR TECHNOLOGIES INC. (0001321655) (Filer) - Item 1.01 Entry into a Material Definitive Agreement",
    headline_kr:
      "Palantir, 미 공공·방산 부문 다년간 AI 운영 플랫폼 대형 수주 계약 SEC 8-K 공시",
    sentiment: "Bullish",
    summary_lines: [
      "SEC Form 8-K(Item 1.01 주요 확정 계약 체결)를 통해 미 연방 기관과의 다년간 AI 소프트웨어 공급 계약 체결을 공시함",
      "실시간 전장·물류 데이터 통합 의사결정을 지원하는 AIP 플랫폼이 핵심 표준 솔루션으로 채택됨",
      "계약 금액은 향후 회계연도에 걸쳐 잔여수행의무(RPO) 및 상업·공공 매출에 순차 반영될 예정임",
    ],
    key_numbers: ["Form 8-K (Item 1.01)", "다년간 장기 공급 계약", "AIP 플랫폼 채택"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001321655&type=8-K",
    published_at: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
  },
  {
    id: "demo-nvda-1",
    unique_id: "0001045810-26-000091",
    ticker: "NVDA",
    company_name: "NVIDIA CORP",
    source_type: "SEC",
    filing_type: "8-K",
    original_title:
      "8-K - NVIDIA CORP (0001045810) (Filer) - Item 2.02 Results of Operations and Financial Condition",
    headline_kr:
      "NVIDIA, AI 데이터센터 가속기 출하 확대로 분기 매출 가이던스 상향 공시",
    sentiment: "Bullish",
    summary_lines: [
      "SEC Form 8-K를 통해 데이터센터 부문 매출이 전년 동기 대비 고성장을 지속했음을 공식 보고함",
      "차세대 아키텍처 양산 출하 본격화로 클라우드 및 엔터프라이즈 AI 팩토리 수요를 견인함",
      "높은 매출총이익률을 유지하며 차기 분기 매출 가이던스를 시장 컨센서스 상단으로 제시함",
    ],
    key_numbers: ["Form 8-K (Item 2.02)", "데이터센터 비중 88%", "매출총이익률 73.5%"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=8-K",
    published_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
  },
  {
    id: "demo-unh-form4",
    unique_id: "0000731766-26-000108",
    ticker: "UNH",
    company_name: "UnitedHealth Group Inc.",
    source_type: "SEC",
    filing_type: "Form 4",
    original_title:
      "4 - UNITEDHEALTH GROUP INC (0000731766) (Issuer) - Statement of Changes in Beneficial Ownership",
    headline_kr:
      "UnitedHealth(유나이티드헬스), 핵심 임원 자사주 장내 직접 매수 SEC Form 4 공시",
    sentiment: "Bullish",
    summary_lines: [
      "SEC Form 4(내부자 지분변동) 공시를 통해 핵심 경영진이 자사 보통주를 장내에서 직접 매입했음을 보고함",
      "스톡옵션 행사가 아닌 자기자금 장내 매수(Transaction Code P)로 주가 저평가에 대한 경영진 자신감으로 해석됨",
      "매입 이후 해당 임원의 직접 보유 지분 수량이 직전 분기 대비 증가함",
    ],
    key_numbers: ["Form 4", "내부자 장내매수(Code P)", "보유지분 확대"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000731766&type=4",
    published_at: new Date(Date.now() - 1000 * 60 * 71).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 71).toISOString(),
  },
  {
    id: "demo-xom-1",
    unique_id: "0000034088-26-000029",
    ticker: "XOM",
    company_name: "Exxon Mobil Corp",
    source_type: "SEC",
    filing_type: "8-K",
    original_title:
      "8-K - EXXON MOBIL CORP (0000034088) (Filer) - Item 7.01 Regulation FD Disclosure (Earnings Considerations)",
    headline_kr:
      "ExxonMobil, 국제 유가 및 정제마진 하락에 따른 분기 영업이익 영향 요인 8-K 공시",
    sentiment: "Bearish",
    summary_lines: [
      "SEC Form 8-K(Item 7.01)를 통해 분기 실적 발표에 앞서 유가 및 정제마진 변동이 이익에 미치는 추정치 공개",
      "원유 판매 단가 하락과 글로벌 정제 마진 축소로 인해 업스트림 및 에너지 제품 부문 이익 감소 요인이 발생함",
      "가이아나 및 퍼미안 분지 생산량 증가가 단가 하락 영향을 일부 상쇄할 것으로 설명함",
    ],
    key_numbers: ["Form 8-K (Item 7.01)", "정제마진 둔화 반영", "퍼미안 증산 지속"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000034088&type=8-K",
    published_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
  },
  {
    id: "demo-cost-1",
    unique_id: "cnbc-cost-monthly-sales",
    ticker: "COST",
    company_name: "Costco · CNBC Earnings",
    source_type: "NEWS",
    filing_type: "Earnings News",
    original_title:
      "Costco reports strong monthly comparable store sales driven by e-commerce and international traffic",
    headline_kr:
      "Costco(코스트코), 이커머스 및 글로벌 객수 증가에 힘입어 월간 동일점포 매출 호조",
    sentiment: "Bullish",
    summary_lines: [
      "CNBC 어닝 피드에 따르면 코스트코의 월간 동일점포 매출 증가율이 시장 예상치를 상회함",
      "신선식품 및 자체브랜드(커클랜드) 수요 강세와 온라인몰 두 자릿수 성장이 실적을 견인함",
      "멤버십 갱신율이 북미 지역에서 역대 최고 수준을 유지하며 안정적인 현금흐름을 뒷받침함",
    ],
    key_numbers: ["동일점포 매출 호조", "이커머스 두 자릿수 성장", "북미 갱신율 92%+"],
    source_url: "https://www.cnbc.com/earnings/",
    published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "demo-amd-1",
    unique_id: "mw-amd-datacenter-update",
    ticker: "AMD",
    company_name: "AMD · MarketWatch",
    source_type: "NEWS",
    filing_type: "Top Stories",
    original_title:
      "AMD outlines next-gen Instinct GPU roadmap while PC client channel inventory normalizes",
    headline_kr:
      "AMD, 차세대 Instinct AI 가속기 로드맵 재확인… PC 채널 재고 조정은 혼조 요인",
    sentiment: "Neutral",
    summary_lines: [
      "MarketWatch 보도에 따르면 AMD는 연례 제품 로드맵에 맞춰 차세대 AI GPU 출시 일정을 차질 없이 진행 중임",
      "서버용 EPYC 프로세서 점유율 확대는 긍정적이나 일반 PC 및 임베디드 부문의 회복 속도는 완만하게 나타남",
      "월가 주요 투자은행들은 데이터센터 AI 매출 가이던스 상향 여부를 핵심 관전 포인트로 제시함",
    ],
    key_numbers: ["서버 CPU 점유율 확대", "차세대 Instinct 로드맵", "임베디드 완만 회복"],
    source_url: "https://www.marketwatch.com/",
    published_at: new Date(Date.now() - 1000 * 60 * 165).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 165).toISOString(),
  },
];

export const SIMULATED_LIVE_FILINGS: Omit<
  FilingItem,
  "id" | "published_at" | "created_at"
>[] = [
  {
    unique_id: "sim-avgo-8k",
    ticker: "AVGO",
    company_name: "Broadcom Inc.",
    source_type: "SEC",
    filing_type: "8-K",
    original_title:
      "8-K - BROADCOM INC. (0001730168) (Filer) - Custom AI Accelerator & Networking Update",
    headline_kr:
      "[속보 테스트] Broadcom, 하이퍼스케일러 맞춤형 AI ASIC 신규 양산 수주 SEC 8-K 공시",
    sentiment: "Bullish",
    summary_lines: [
      "SEC Form 8-K를 통해 신규 대형 클라우드 고객사와 맞춤형 AI 가속기(XPU) 및 이더넷 스위치 공급 확대 보고",
      "AI 네트워킹 및 커스텀 칩 매출 비중이 반도체 솔루션 부문 내 핵심 성장축으로 자리매김함",
      "VMware 소프트웨어 통합 시너지로 잉여현금흐름(FCF) 마진 개선세가 지속됨",
    ],
    key_numbers: ["Form 8-K 공시", "커스텀 AI ASIC 수주", "FCF 마진 개선"],
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001730168&type=8-K",
  },
  {
    unique_id: "sim-yahoo-fed",
    ticker: "MARKET",
    company_name: "Yahoo Finance",
    source_type: "NEWS",
    filing_type: "Market News",
    original_title:
      "Wall Street digests latest Federal Reserve commentary ahead of upcoming FOMC meeting",
    headline_kr:
      "[속보 테스트] 차기 FOMC 앞두고 연준 위원 발언 주시… 미 주요 지수 선물 보합권 등락",
    sentiment: "Neutral",
    summary_lines: [
      "야후 파이낸스 실시간 시황에 따르면 연준 주요 인사들의 데이터 의존적 금리 경로 발언에 시장이 신중한 반응을 보임",
      "고용 및 소비 지표 발표를 앞두고 대형 기술주와 전통 가치주 간 순환매 장세가 전개됨",
      "달러 인덱스와 미 국채 금리는 좁은 박스권 내에서 등락하며 방향성을 탐색 중임",
    ],
    key_numbers: ["FOMC 경계감", "순환매 장세", "국채 금리 보합"],
    source_url: "https://finance.yahoo.com/",
  },
];
