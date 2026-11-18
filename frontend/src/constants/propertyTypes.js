// 상단 메뉴(직방 스타일)의 매물 종류. type 값은 API 쿼리 ?type= 로 그대로 전달됩니다.
export const PROPERTY_TYPES = [
  { type: 'apt', path: '/apartment', label: '아파트' },
  { type: 'villa', path: '/villa', label: '빌라, 투룸' },
  { type: 'oneroom', path: '/oneroom', label: '원룸' },
  { type: 'officetel', path: '/officetel', label: '오피스텔' },
  { type: 'store', path: '/store', label: '상가, 사무실' },
];

// 매물 종류별 실거래가 출처 (국토교통부 실거래가 공개시스템의 해당 메뉴)
const SOURCES = {
  apt: '국토교통부 실거래가 공개시스템 (아파트 매매)',
  villa: '국토교통부 실거래가 공개시스템 (연립/다세대 매매)',
  oneroom: '국토교통부 실거래가 공개시스템 (단독/다가구·연립/다세대 매매)',
  officetel: '국토교통부 실거래가 공개시스템 (오피스텔 매매)',
  store: '국토교통부 실거래가 공개시스템 (상업업무용 부동산 매매)',
};
// 전세·월세는 같은 메뉴의 "전월세" 자료
export const dataSourceOf = (type, deal = 'sale') => {
  const src = SOURCES[type] ?? SOURCES.apt;
  return deal === 'sale' ? src : src.replaceAll('매매', '전월세');
};

export const DEFAULT_TYPE = 'apt';
export const typeInfo = (type) => PROPERTY_TYPES.find((t) => t.type === type) ?? PROPERTY_TYPES[0];

// 거래 종류 탭 — 빌라·원룸만. 원룸은 월세가 기본
export const DEAL_TYPES = [
  { key: 'sale', label: '매매', priceLabel: '실거래가' },
  { key: 'jeonse', label: '전세', priceLabel: '전세 보증금' },
  { key: 'monthly', label: '월세', priceLabel: '보증금 / 월세' },
];
const DEAL_TABS = { villa: ['sale', 'jeonse', 'monthly'], oneroom: ['monthly', 'jeonse', 'sale'] };
export const dealTabsOf = (type) => (DEAL_TABS[type] ?? []).map((k) => DEAL_TYPES.find((d) => d.key === k));
export const defaultDealOf = (type) => DEAL_TABS[type]?.[0] ?? 'sale';
export const dealInfo = (deal) => DEAL_TYPES.find((d) => d.key === deal) ?? DEAL_TYPES[0];

// 필터 사이드바 가격 칩 (만원) — 매물 종류 · 거래 종류별 서울 실거래 가격대에 맞춤
// 매매: 매매가 / 전세: 보증금 / 월세: 보증금(price) + 월세(rent) 두 줄
const ALL = { label: '전체', min: '', max: '' };
const chip = (label, min, max, title) => ({ label, min: String(min ?? ''), max: String(max ?? ''), title });
const PRICE_PRESETS = {
  apt: { sale: [ALL, chip('~6억', '', 60000), chip('6~9억', 60000, 90000), chip('9~12억', 90000, 120000), chip('12억~', 120000, '')] },
  // 연립·다세대(빌라, 투룸)
  villa: {
    sale: [ALL, chip('~2억', '', 20000), chip('2~3억', 20000, 30000), chip('3~5억', 30000, 50000), chip('5억~', 50000, '')],
    jeonse: [ALL, chip('~1억', '', 10000), chip('1~2억', 10000, 20000), chip('2~3억', 20000, 30000), chip('3억~', 30000, '')],
    monthly: [ALL, chip('~1천', '', 1000), chip('1천~3천', 1000, 3000), chip('3천~', 3000, '')],
  },
  // 원룸 (다세대·도시형생활주택 원룸형)
  oneroom: {
    sale: [ALL, chip('~1억', '', 10000), chip('1~1.5억', 10000, 15000), chip('1.5~2억', 15000, 20000), chip('2억~', 20000, '')],
    jeonse: [ALL, chip('~5천', '', 5000), chip('5천~1억', 5000, 10000), chip('1~1.5억', 10000, 15000), chip('1.5억~', 15000, '')],
    monthly: [ALL, chip('~500', '', 500), chip('500~1천', 500, 1000), chip('1천~', 1000, '')],
  },
};
// 월세 칩 (만원/월) — 월세 탭에서만
const RENT_PRESETS = {
  villa: [ALL, chip('~50', '', 50), chip('50~80', 50, 80), chip('80~', 80, '')],
  oneroom: [ALL, chip('~40', '', 40), chip('40~60', 40, 60), chip('60~80', 60, 80), chip('80~', 80, '')],
};
export const pricePresetsOf = (type, deal = 'sale') => {
  const t = PRICE_PRESETS[type] ?? PRICE_PRESETS.apt;
  return t[deal] ?? t.sale;
};
export const rentPresetsOf = (type) => RENT_PRESETS[type] ?? RENT_PRESETS.oneroom;
// 직접 입력칸 증감 단위 (만원)
export const priceStepOf = (type, deal = 'sale') => {
  if (deal === 'monthly') return 100;
  return type === 'oneroom' ? 500 : 1000;
};

// 필터 사이드바 면적 칩 (전용 ㎡) — 매물 종류별 실제 면적대에 맞춤
const AREA_PRESETS = {
  apt: [
    ALL,
    { label: '~60㎡', title: '소형', min: '', max: '60' },
    { label: '60~85㎡', title: '중형', min: '60', max: '85' },
    { label: '85㎡~', title: '대형', min: '85', max: '' },
  ],
  villa: [
    ALL,
    { label: '~40㎡', title: '원룸·작은 투룸', min: '', max: '40' },
    { label: '40~60㎡', title: '투룸', min: '40', max: '60' },
    { label: '60㎡~', title: '쓰리룸 이상', min: '60', max: '' },
  ],
  oneroom: [
    ALL,
    { label: '~20㎡', title: '작은 원룸', min: '', max: '20' },
    { label: '20~26㎡', title: '보통 원룸', min: '20', max: '26' },
    { label: '26㎡~', title: '넓은 원룸·1.5룸', min: '26', max: '' },
  ],
};
export const areaPresetsOf = (type) => AREA_PRESETS[type] ?? AREA_PRESETS.apt;

// 역세권 필터: 가까운 지하철역까지 도보 N분 이내 (직선거리 기준)
export const NEAR_STATION_MIN = 10;

// 지도 필터가 URL 쿼리에 저장하는 키
export const FILTER_KEYS = ['deal', 'gu', 'minPrice', 'maxPrice', 'minRent', 'maxRent', 'minArea', 'maxArea', 'maxWalk'];
