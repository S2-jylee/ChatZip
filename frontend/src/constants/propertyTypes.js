// 지도 화면 위쪽 매물 종류 탭 (/map?type=…). type 값은 API 쿼리 ?type= 로 그대로 전달됩니다.
// sample: true = 실거래 DB가 아직 없어 샘플(더미) 데이터로 보여주는 종류 → 탭 · 목록에 "샘플" 표시
import { MAP_PATH } from './menus';

export const PROPERTY_TYPES = [
  { type: 'apt', path: MAP_PATH, label: '아파트' },
  { type: 'villa', path: `${MAP_PATH}?type=villa`, label: '빌라, 투룸', sample: true },
  { type: 'oneroom', path: `${MAP_PATH}?type=oneroom`, label: '원룸', sample: true },
  { type: 'officetel', path: `${MAP_PATH}?type=officetel`, label: '오피스텔', sample: true },
  { type: 'store', path: `${MAP_PATH}?type=store`, label: '상가, 사무실', sample: true },
];
export const isTypeKey = (t) => PROPERTY_TYPES.some((x) => x.type === t);

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

// 거래 종류 탭 — 아파트·빌라·원룸. 원룸은 월세가 기본 (아파트 전월세 = 국토부 아파트 전월세 실거래, 무료)
export const DEAL_TYPES = [
  { key: 'sale', label: '매매', priceLabel: '실거래가' },
  { key: 'jeonse', label: '전세', priceLabel: '전세 보증금' },
  { key: 'monthly', label: '월세', priceLabel: '보증금 / 월세' },
];
const DEAL_TABS = { apt: ['sale', 'jeonse', 'monthly'], officetel: ['monthly', 'jeonse', 'sale'], store: ['monthly', 'jeonse', 'sale'], villa: ['sale', 'jeonse', 'monthly'], oneroom: ['monthly', 'jeonse', 'sale'] };
export const dealTabsOf = (type) => (DEAL_TABS[type] ?? []).map((k) => DEAL_TYPES.find((d) => d.key === k));
export const defaultDealOf = (type) => DEAL_TABS[type]?.[0] ?? 'sale';
export const dealInfo = (deal) => DEAL_TYPES.find((d) => d.key === deal) ?? DEAL_TYPES[0];

// 필터 사이드바 가격 칩 (만원) — 매물 종류 · 거래 종류별 가격대 (서울 기준으로 만든 값 — 경기도 시세에 맞게 조정 필요)
// 매매: 매매가 / 전세: 보증금 / 월세: 보증금(price) + 월세(rent) 두 줄
const ALL = { label: '전체', min: '', max: '' };
const chip = (label, min, max, title) => ({ label, min: String(min ?? ''), max: String(max ?? ''), title });
const PRICE_PRESETS = {
  apt: {
    sale: [ALL, chip('~6억', '', 60000), chip('6~9억', 60000, 90000), chip('9~12억', 90000, 120000), chip('12억~', 120000, '')],
    jeonse: [ALL, chip('~3억', '', 30000), chip('3~5억', 30000, 50000), chip('5~8억', 50000, 80000), chip('8억~', 80000, '')],
    monthly: [ALL, chip('~5천', '', 5000), chip('5천~1억', 5000, 10000), chip('1억~', 10000, '')],
  },
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
  officetel: {
    sale: [ALL, chip('~2억', '', 20000), chip('2~3억', 20000, 30000), chip('3~5억', 30000, 50000), chip('5억~', 50000, '')],
    jeonse: [ALL, chip('~1.5억', '', 15000), chip('1.5~2.5억', 15000, 25000), chip('2.5억~', 25000, '')],
    monthly: [ALL, chip('~1천', '', 1000), chip('1천~3천', 1000, 3000), chip('3천~', 3000, '')],
  },
  // 상가 · 사무실: 월세 = 보증금 + 월 임대료
  store: {
    sale: [ALL, chip('~3억', '', 30000), chip('3~10억', 30000, 100000), chip('10억~', 100000, '')],
    jeonse: [ALL, chip('~2억', '', 20000), chip('2~5억', 20000, 50000), chip('5억~', 50000, '')],
    monthly: [ALL, chip('~3천', '', 3000), chip('3천~1억', 3000, 10000), chip('1억~', 10000, '')],
  },
};
// 월세 칩 (만원/월) — 월세 탭에서만
const RENT_PRESETS = {
  apt: [ALL, chip('~100', '', 100), chip('100~200', 100, 200), chip('200~', 200, '')],
  villa: [ALL, chip('~50', '', 50), chip('50~80', 50, 80), chip('80~', 80, '')],
  oneroom: [ALL, chip('~40', '', 40), chip('40~60', 40, 60), chip('60~80', 60, 80), chip('80~', 80, '')],
  officetel: [ALL, chip('~60', '', 60), chip('60~100', 60, 100), chip('100~', 100, '')],
  store: [ALL, chip('~200', '', 200), chip('200~500', 200, 500), chip('500~', 500, '')],
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
  officetel: [
    ALL,
    { label: '~30㎡', title: '원룸형', min: '', max: '30' },
    { label: '30~50㎡', title: '1.5룸 · 투룸', min: '30', max: '50' },
    { label: '50㎡~', title: '아파텔', min: '50', max: '' },
  ],
  // 상가 · 사무실은 평으로 많이 찾음 (1평 = 3.3058㎡)
  store: [
    ALL,
    { label: '~10평', title: '~33㎡', min: '', max: '33' },
    { label: '10~30평', title: '33~99㎡', min: '33', max: '99' },
    { label: '30평~', title: '99㎡~', min: '99', max: '' },
  ],
};
export const areaPresetsOf = (type) => AREA_PRESETS[type] ?? AREA_PRESETS.apt;

// 역세권 필터: 가까운 지하철역까지 도보 N분 이내 (직선거리 기준)
export const NEAR_STATION_MIN = 10;

// 지도 필터가 URL 쿼리에 저장하는 키
export const FILTER_KEYS = [
  'deal', 'gu', 'minPrice', 'maxPrice', 'minRent', 'maxRent', 'minArea', 'maxArea', 'maxWalk',
  ...['sub', 'struct', 'floor', 'maxAge', 'maxFee', 'biz', 'opts'], // 상세 필터 (DETAIL_FILTERS)
];

/**
 * 상세 필터 — 필터 줄의 [상세] 버튼. 직방 · 다방(원룸 · 오피스텔), 네모 · 네이버부동산(상가 · 사무실) 필터 구성 참고
 * multi: 여러 개 고름 → 쿼리에 쉼표로 (opts=parking,pet). 아니면 하나만 (다시 누르면 해제)
 * 데이터 출처: 층 · 준공연도 · 역세권 = 국토부 실거래가 + 역 좌표 (✅ 무료)
 *             구조 · 관리비 · 옵션 · 업종 · 권리금 = 실거래 자료에 없음 → 중개사가 등록한 매물(내 등록매물) 정보
 */
const G = {
  walk: { key: 'maxWalk', label: '역세권', options: [['5', '도보 5분'], ['10', '도보 10분'], ['15', '도보 15분']] },
  age: { key: 'maxAge', label: '준공', options: [['5', '5년 이내'], ['10', '10년 이내'], ['15', '15년 이내'], ['20', '20년 이내']] },
  floor: { key: 'floor', label: '층', options: [['low', '저층 (1~5층)'], ['mid', '중층 (6~15층)'], ['high', '고층 (16층~)']] },
  fee: { key: 'maxFee', label: '관리비', options: [['5', '5만 이하'], ['10', '10만 이하'], ['20', '20만 이하']] },
};
export const DETAIL_FILTERS = {
  apt: [G.walk, G.age, G.floor,
    { key: 'opts', label: '옵션', multi: true, options: [['parking', '주차 가능'], ['pet', '반려동물'], ['loan', '전세대출 가능']] }],
  villa: [G.walk, G.age,
    { key: 'floor', label: '층', options: [['semi', '반지하 제외'], ['ground', '1층'], ['upper', '2층 이상']] },
    G.fee,
    { key: 'opts', label: '옵션', multi: true, options: [['parking', '주차 가능'], ['elevator', '엘리베이터'], ['pet', '반려동물'], ['loan', '전세대출 가능']] }],
  oneroom: [G.walk,
    { key: 'struct', label: '구조', multi: true, options: [['open', '오픈형'], ['split', '분리형'], ['duplex', '복층']] },
    G.fee,
    { key: 'opts', label: '옵션', multi: true, options: [['full', '풀옵션'], ['parking', '주차 가능'], ['elevator', '엘리베이터'], ['pet', '반려동물'], ['loan', '전세대출 가능']] }],
  officetel: [G.walk,
    { key: 'struct', label: '구조', multi: true, options: [['open', '오픈형 원룸'], ['split', '분리형 원룸'], ['two', '투룸 이상'], ['duplex', '복층']] },
    G.floor, G.fee, G.age,
    { key: 'opts', label: '옵션', multi: true, options: [['full', '풀옵션'], ['parking', '주차 가능'], ['pet', '반려동물'], ['loan', '전세대출 가능']] }],
  store: [
    { key: 'sub', label: '종류', options: [['store', '상가'], ['office', '사무실']] },
    { key: 'floor', label: '층', multi: true, options: [['b1', '지하'], ['1', '1층'], ['2', '2층 이상']] },
    { key: 'biz', label: '추천 업종', multi: true, options: [['food', '음식점'], ['cafe', '카페'], ['retail', '판매점'], ['academy', '학원'], ['medical', '병원 · 약국'], ['office', '사무실']] },
    G.walk,
    { key: 'opts', label: '조건', multi: true, options: [['norights', '무권리'], ['parking', '주차 가능'], ['elevator', '엘리베이터'], ['corner', '코너 · 대로변'], ['vacant', '공실 (바로 입주)']] }],
};
export const detailFiltersOf = (type) => DETAIL_FILTERS[type] ?? DETAIL_FILTERS.apt;
// 상세 필터 표시 이름 (목록 카드 태그 등)
export const OPTION_LABEL = Object.fromEntries(
  Object.values(DETAIL_FILTERS).flat().flatMap((g) => g.options.map(([v, l]) => [`${g.key}:${v}`, l])),
);
