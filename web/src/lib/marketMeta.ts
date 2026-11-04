export type SectorId =
  | "ALL"
  | "TECH_AI"
  | "SEMI"
  | "BIO"
  | "FINANCE"
  | "ENERGY_IND"
  | "CONSUMER"
  | "MACRO";

export const SECTOR_TABS: { id: SectorId; label: string }[] = [
  { id: "ALL", label: "전체 섹터" },
  { id: "MACRO", label: "시황·거시" },
  { id: "TECH_AI", label: "빅테크·SW" },
  { id: "SEMI", label: "반도체" },
  { id: "BIO", label: "바이오·헬스" },
  { id: "FINANCE", label: "금융·핀테크" },
  { id: "ENERGY_IND", label: "에너지·산업" },
  { id: "CONSUMER", label: "소비재·유통" },
];

export const KR_COMPANY_NAMES: Record<string, string> = {
  MARKET: "미국 증시 시황",
  AAPL: "애플",
  MSFT: "마이크로소프트",
  NVDA: "엔비디아",
  GOOGL: "알파벳(구글)",
  GOOG: "알파벳(구글)",
  AMZN: "아마존",
  META: "메타",
  TSLA: "테슬라",
  AVGO: "브로드컴",
  AMD: "AMD",
  INTC: "인텔",
  MU: "마이크론",
  QCOM: "퀄컴",
  TXN: "텍사스인스트루먼트",
  AMAT: "어플라이드머티어리얼즈",
  LRCX: "램리서치",
  KLAC: "KLA",
  ARM: "ARM 홀딩스",
  SMCI: "슈퍼마이크로",
  PLTR: "팔란티어",
  ORCL: "오라클",
  CRM: "세일즈포스",
  NOW: "서비스나우",
  SNOW: "스노우플레이크",
  PANW: "팔로알토네트웍스",
  CRWD: "크라우드스트라이크",
  ADBE: "어도비",
  NFLX: "넷플릭스",
  IBM: "IBM",
  CSCO: "시스코",
  LLY: "일라이 릴리",
  UNH: "유나이티드헬스",
  JNJ: "존슨앤드존슨",
  ABBV: "애브비",
  MRK: "머크",
  PFE: "화이자",
  AMGN: "암젠",
  GILD: "길리어드",
  VRTX: "버텍스",
  ISRG: "인튜이티브서지컬",
  TMO: "써모피셔",
  ABT: "애보트",
  AVTR: "아반토",
  MRNA: "모더나",
  REGN: "리제네론",
  JPM: "JP모건",
  BAC: "뱅크오브아메리카",
  WFC: "웰스파고",
  C: "씨티그룹",
  GS: "골드만삭스",
  MS: "모건스탠리",
  BLK: "블랙록",
  BX: "블랙스톤",
  V: "비자",
  MA: "마스터카드",
  AXP: "아메리칸익스프레스",
  PYPL: "페이팔",
  COIN: "코인베이스",
  HOOD: "로빈후드",
  SOFI: "소파이",
  MSTR: "스트래티지",
  "BRK-B": "버크셔해서웨이",
  "BRK-A": "버크셔해서웨이",
  XOM: "엑슨모빌",
  CVX: "셰브론",
  COP: "코노코필립스",
  NEE: "넥스트에라에너지",
  CAT: "캐터필러",
  DE: "디어앤컴퍼니",
  GE: "GE 에어로스페이스",
  BA: "보잉",
  LMT: "록히드마틴",
  RTX: "RTX(레이시온)",
  HON: "허니웰",
  UNP: "유니온퍼시픽",
  WAB: "웹텍",
  ASH: "애슐랜드",
  COST: "코스트코",
  WMT: "월마트",
  TGT: "타겟",
  HD: "홈디포",
  LOW: "로우스",
  PG: "P&G",
  KO: "코카콜라",
  PEP: "펩시코",
  MCD: "맥도날드",
  SBUX: "스타벅스",
  NKE: "나이키",
  DIS: "디즈니",
  UBER: "우버",
  ABNB: "에어비앤비",
  BKNG: "부킹홀딩스",
  F: "포드",
  GM: "제너럴모터스",
};

const TICKER_SECTOR_MAP: Record<string, SectorId> = {
  MARKET: "MACRO",
  AAPL: "TECH_AI",
  MSFT: "TECH_AI",
  GOOGL: "TECH_AI",
  GOOG: "TECH_AI",
  AMZN: "TECH_AI",
  META: "TECH_AI",
  PLTR: "TECH_AI",
  ORCL: "TECH_AI",
  CRM: "TECH_AI",
  NOW: "TECH_AI",
  SNOW: "TECH_AI",
  PANW: "TECH_AI",
  CRWD: "TECH_AI",
  ADBE: "TECH_AI",
  NFLX: "TECH_AI",
  IBM: "TECH_AI",
  CSCO: "TECH_AI",
  NVDA: "SEMI",
  AVGO: "SEMI",
  AMD: "SEMI",
  INTC: "SEMI",
  MU: "SEMI",
  QCOM: "SEMI",
  TXN: "SEMI",
  AMAT: "SEMI",
  LRCX: "SEMI",
  KLAC: "SEMI",
  ARM: "SEMI",
  SMCI: "SEMI",
  LLY: "BIO",
  UNH: "BIO",
  JNJ: "BIO",
  ABBV: "BIO",
  MRK: "BIO",
  PFE: "BIO",
  AMGN: "BIO",
  GILD: "BIO",
  VRTX: "BIO",
  ISRG: "BIO",
  TMO: "BIO",
  ABT: "BIO",
  AVTR: "BIO",
  MRNA: "BIO",
  REGN: "BIO",
  JPM: "FINANCE",
  BAC: "FINANCE",
  WFC: "FINANCE",
  C: "FINANCE",
  GS: "FINANCE",
  MS: "FINANCE",
  BLK: "FINANCE",
  BX: "FINANCE",
  V: "FINANCE",
  MA: "FINANCE",
  AXP: "FINANCE",
  PYPL: "FINANCE",
  COIN: "FINANCE",
  HOOD: "FINANCE",
  SOFI: "FINANCE",
  MSTR: "FINANCE",
  "BRK-B": "FINANCE",
  "BRK-A": "FINANCE",
  XOM: "ENERGY_IND",
  CVX: "ENERGY_IND",
  COP: "ENERGY_IND",
  NEE: "ENERGY_IND",
  CAT: "ENERGY_IND",
  DE: "ENERGY_IND",
  GE: "ENERGY_IND",
  BA: "ENERGY_IND",
  LMT: "ENERGY_IND",
  RTX: "ENERGY_IND",
  HON: "ENERGY_IND",
  UNP: "ENERGY_IND",
  WAB: "ENERGY_IND",
  ASH: "ENERGY_IND",
  COST: "CONSUMER",
  WMT: "CONSUMER",
  TGT: "CONSUMER",
  HD: "CONSUMER",
  LOW: "CONSUMER",
  PG: "CONSUMER",
  KO: "CONSUMER",
  PEP: "CONSUMER",
  MCD: "CONSUMER",
  SBUX: "CONSUMER",
  NKE: "CONSUMER",
  DIS: "CONSUMER",
  TSLA: "CONSUMER",
  F: "CONSUMER",
  GM: "CONSUMER",
  UBER: "CONSUMER",
  ABNB: "CONSUMER",
  BKNG: "CONSUMER",
};

export function getKoreanCompanyName(ticker: string): string | null {
  return KR_COMPANY_NAMES[ticker.toUpperCase()] ?? null;
}

export function inferSector(ticker: string, textHaystack: string): SectorId {
  const upper = ticker.toUpperCase();
  if (TICKER_SECTOR_MAP[upper]) {
    return TICKER_SECTOR_MAP[upper];
  }
  const lower = textHaystack.toLowerCase();
  if (/(pharma|biotech|clinical|fda|therapeutics|medical|임상|치료제|제약)/.test(lower)) {
    return "BIO";
  }
  if (/(semiconductor|chip|gpu|wafer|foundry|반도체|가속기)/.test(lower)) {
    return "SEMI";
  }
  if (/(bank|bancorp|financial|capital|credit|insurance|은행|금융|회사채)/.test(lower)) {
    return "FINANCE";
  }
  if (/(oil|energy|petroleum|aerospace|industrial|chemical|유가|정제|항공|화학)/.test(lower)) {
    return "ENERGY_IND";
  }
  if (/(retail|store|beverage|restaurant|consumer|유통|매장|소비)/.test(lower)) {
    return "CONSUMER";
  }
  if (/(software|cloud|cyber|ai |클라우드|소프트웨어)/.test(lower)) {
    return "TECH_AI";
  }
  return upper === "MARKET" ? "MACRO" : "ENERGY_IND";
}

const SEC_ITEM_LABELS: Record<string, string> = {
  "1.01": "주요 계약 체결",
  "1.02": "주요 계약 해지",
  "1.03": "파산·회생 절차",
  "2.01": "자산 인수·매각 완료",
  "2.02": "실적 발표",
  "2.03": "신규 채무·차입 발생",
  "2.05": "구조조정·인력감축 비용",
  "2.06": "자산 손상차손 인식",
  "3.01": "상장폐지·유지기준 통보",
  "4.01": "외부 감사인 변경",
  "4.02": "기존 재무제표 재작성",
  "5.02": "임원·이사회 변동",
  "5.03": "정관·회계연도 변경",
  "5.07": "주주총회 표결 결과",
  "7.01": "공정공시(가이던스 등)",
  "8.01": "주요 경영사항 안내",
  "9.01": "재무제표·첨부문서",
};

export function humanizeKeyNumber(tag: string): string {
  const itemMatch = tag.match(/item\s*(\d+\.\d+)/i);
  if (itemMatch) {
    const code = itemMatch[1];
    const kr = SEC_ITEM_LABELS[code];
    if (kr && !tag.includes(kr)) {
      return `${kr} (Item ${code})`;
    }
  }
  if (/^form\s*4$/i.test(tag.trim())) {
    return "내부자 지분변동 (Form 4)";
  }
  if (/^form\s*8-k$/i.test(tag.trim())) {
    return "수시공시 (Form 8-K)";
  }
  return tag;
}

export interface GlossaryItem {
  term: string;
  meaning: string;
}

const GLOSSARY_RULES: { pattern: RegExp; term: string; meaning: string }[] = [
  {
    pattern: /8-k/i,
    term: "Form 8-K (수시공시)",
    meaning:
      "기업에 주가에 영향을 줄 수 있는 중대한 사건(실적, 대형 계약, 임원 교체 등)이 발생했을 때 4영업일 이내에 SEC에 의무 제출하는 공시입니다.",
  },
  {
    pattern: /form\s*4\b/i,
    term: "Form 4 (내부자 거래 공시)",
    meaning:
      "CEO·임원·이사회·10% 이상 대주주가 자사 주식을 매수하거나 매도했을 때 2영업일 이내에 보고하는 지분 변동 공시입니다.",
  },
  {
    pattern: /item\s*2\.02/i,
    term: "Item 2.02 (실적 공시)",
    meaning: "분기·연간 매출과 이익 등 경영 실적을 공식 발표하는 8-K 핵심 항목입니다.",
  },
  {
    pattern: /item\s*1\.01/i,
    term: "Item 1.01 (주요 확정 계약)",
    meaning: "대규모 수주, 인수합병, 전략적 제휴 등 중대한 법적 구속력이 있는 계약을 체결했을 때 공시합니다.",
  },
  {
    pattern: /item\s*5\.02/i,
    term: "Item 5.02 (임원·이사 변동)",
    meaning: "CEO·CFO 등 핵심 경영진의 사임·해임 또는 신규 선임 시 제출하는 항목입니다.",
  },
  {
    pattern: /item\s*7\.01/i,
    term: "Item 7.01 (공정공시 · Reg FD)",
    meaning: "특정 기관에만 정보를 주지 않고 모든 투자자에게 동시에 가이던스·발표자료를 공개하는 공정공시입니다.",
  },
  {
    pattern: /item\s*8\.01/i,
    term: "Item 8.01 (기타 주요사항)",
    meaning: "자사주 매입, 소송 진행, 회사채 발행 등 투자자가 알아야 할 주요 이슈를 자율·의무 보고하는 항목입니다.",
  },
  {
    pattern: /\bcet1\b/i,
    term: "CET1 (보통주자본비율)",
    meaning: "은행의 위기 대응 능력을 보여주는 핵심 건전성 지표로, 높을수록 배당·자사주 매입 여력이 큽니다.",
  },
  {
    pattern: /\brpo\b|잔여수행의무/i,
    term: "RPO (잔여수행의무)",
    meaning: "이미 계약을 맺었으나 아직 매출로 인식되지 않은 수주 잔고로, 미래 매출 성장성을 보여줍니다.",
  },
  {
    pattern: /\bfcf\b|잉여현금흐름/i,
    term: "FCF (잉여현금흐름)",
    meaning: "영업으로 벌어들인 현금에서 설비투자(CapEx)를 빼고 실제로 기업 손에 남는 순수 현금입니다.",
  },
  {
    pattern: /\bfomc\b/i,
    term: "FOMC (연방공개시장위원회)",
    meaning: "미국 연준(Fed)이 기준금리와 통화정책 방향을 결정하는 정례 회의입니다.",
  },
  {
    pattern: /\byoy\b/i,
    term: "YoY (전년 동기 대비)",
    meaning: "작년 같은 분기(또는 같은 달)와 비교한 증감률입니다.",
  },
];

export function extractGlossaryHints(haystack: string): GlossaryItem[] {
  const matched: GlossaryItem[] = [];
  for (const rule of GLOSSARY_RULES) {
    if (rule.pattern.test(haystack)) {
      matched.push({ term: rule.term, meaning: rule.meaning });
    }
    if (matched.length >= 4) break;
  }
  return matched;
}

const KEYWORD_TO_TICKER: [RegExp, string, string][] = [
  [/\bnvidia\b/i, "NVDA", "NVIDIA"],
  [/\bapple\b/i, "AAPL", "Apple"],
  [/\bmicrosoft\b/i, "MSFT", "Microsoft"],
  [/\balphabet\b|\bgoogle\b/i, "GOOGL", "Alphabet"],
  [/\bamazon\b|\baws\b/i, "AMZN", "Amazon"],
  [/\bmeta platforms\b|\bmeta\b/i, "META", "Meta"],
  [/\btesla\b/i, "TSLA", "Tesla"],
  [/\beli lilly\b/i, "LLY", "Eli Lilly"],
  [/\bjpmorgan\b|\bjp morgan\b/i, "JPM", "JPMorgan Chase"],
  [/\bpalantir\b/i, "PLTR", "Palantir"],
  [/\bbroadcom\b/i, "AVGO", "Broadcom"],
  [/\bamd\b|\badvanced micro devices\b/i, "AMD", "AMD"],
  [/\bintel\b/i, "INTC", "Intel"],
  [/\bcostco\b/i, "COST", "Costco"],
  [/\bwalmart\b/i, "WMT", "Walmart"],
  [/\bexxon\b/i, "XOM", "ExxonMobil"],
  [/\bchevron\b/i, "CVX", "Chevron"],
  [/\bboeing\b/i, "BA", "Boeing"],
  [/\bnetflix\b/i, "NFLX", "Netflix"],
  [/\bcoinbase\b/i, "COIN", "Coinbase"],
  [/\bgoldman sachs\b/i, "GS", "Goldman Sachs"],
  [/\bmorgan stanley\b/i, "MS", "Morgan Stanley"],
  [/\bpfizer\b/i, "PFE", "Pfizer"],
  [/\bunitedhealth\b/i, "UNH", "UnitedHealth"],
];

export function inferTickerFromNewsText(
  title: string,
  description: string,
  sourceName: string
): { ticker: string; companyName: string } {
  const combined = `${title} ${description}`;

  // 1. Explicit exchange ticker pattern like (NASDAQ: NVDA) or (NYSE: LLY)
  const exchMatch = combined.match(
    /\((?:NASDAQ|NYSE|AMEX|NYSE\s*Arca)\s*:\s*([A-Z]{1,5})\)/i
  );
  if (exchMatch) {
    const t = exchMatch[1].toUpperCase();
    const kr = getKoreanCompanyName(t);
    return {
      ticker: t,
      companyName: kr ? `${kr} · ${sourceName}` : `${t} · ${sourceName}`,
    };
  }

  // 2. Cashtag pattern like $NVDA
  const cashMatch = title.match(/\$([A-Z]{2,5})\b/);
  if (cashMatch) {
    const t = cashMatch[1].toUpperCase();
    return { ticker: t, companyName: `${t} · ${sourceName}` };
  }

  // 3. Major company name match
  for (const [regex, ticker, comp] of KEYWORD_TO_TICKER) {
    if (regex.test(title)) {
      return { ticker, companyName: `${comp} · ${sourceName}` };
    }
  }

  return { ticker: "MARKET", companyName: sourceName };
}
