// 지도 위 "주변 시설" 종류. code = 카카오 로컬 카테고리 코드, keyword = 카테고리가 없어 키워드로 찾는 것
export const TRANSIT_KINDS = [
  { key: 'subway', label: '지하철역', code: 'SW8', maxSpan: 0.4, color: '#1E3A8A' },
  { key: 'bus', label: '버스정류장', maxSpan: 0.045, color: '#16A34A' },
  { key: 'school', label: '학교', code: 'SC4', maxSpan: 0.12, color: '#D97706' },
];

// 업종별 필터 (편의시설)
export const AMENITY_KINDS = [
  { key: 'store', label: '편의점', code: 'CS2', maxSpan: 0.05, color: '#0EA5E9' },
  { key: 'mart', label: '마트', code: 'MT1', maxSpan: 0.05, color: '#DB2777' },
  { key: 'cafe', label: '카페', code: 'CE7', maxSpan: 0.05, color: '#92400E' },
  { key: 'food', label: '음식점', code: 'FD6', maxSpan: 0.05, color: '#EA580C' },
  { key: 'hospital', label: '병원', code: 'HP8', maxSpan: 0.05, color: '#DC2626' },
  { key: 'pharmacy', label: '약국', code: 'PM9', maxSpan: 0.05, color: '#059669' },
  { key: 'bank', label: '은행', code: 'BK9', maxSpan: 0.05, color: '#0F766E' },
  { key: 'kids', label: '어린이집·유치원', code: 'PS3', maxSpan: 0.05, color: '#CA8A04' },
  { key: 'academy', label: '학원', code: 'AC5', maxSpan: 0.05, color: '#4F46E5' },
  { key: 'culture', label: '문화시설', code: 'CT1', maxSpan: 0.05, color: '#9333EA' },
];

// 특정 매물 종류 화면에만 있는 버튼 — 원룸: 대학가 탐색용 대학교 (카카오에 대학 전용 카테고리가 없어 키워드 검색)
export const UNIV_KIND = { key: 'univ', label: '대학교', short: '대학', keyword: '대학교', maxSpan: 0.2, color: '#7C3AED' };
export const EXTRA_KINDS_BY_TYPE = { oneroom: [UNIV_KIND] };

// maxSpan = 이 값(위도 차, 1 ≈ 111km) 이하로 확대했을 때만 표시. 지하철은 수가 적어 넓게도 보임
export const PLACE_KINDS = [...TRANSIT_KINDS, UNIV_KIND, ...AMENITY_KINDS];
export const placeKind = (key) => PLACE_KINDS.find((k) => k.key === key);
