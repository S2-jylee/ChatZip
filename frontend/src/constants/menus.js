// 상단 · 하단 · 모바일 메뉴 (한 곳에서 관리)
// DB가 아파트 실거래 데이터만 있으므로, 매물 종류별 메뉴 대신 "기능(=백엔드 API)" 단위로 메뉴를 나눔
// 매물 종류(아파트 · 빌라 · 원룸 · 오피스텔 · 상가)는 지도 화면 안의 탭으로 (아파트 외는 샘플 데이터)
// 화면 주소 (한 곳에서 관리 — 링크마다 문자열을 직접 쓰지 않음)
export const MAP_PATH = '/map';
export const SEARCH_PATH = '/search';
export const RECOMMEND_PATH = '/search?tab=recommend';
export const ANALYSIS_PATH = '/analysis';
export const PREDICT_PATH = '/predict';
export const FAVORITES_PATH = '/favorites';

export const MAIN_MENUS = [
  { to: '/', label: '홈', end: true },
  { to: SEARCH_PATH, label: '매물찾기', desc: '조건 검색 · 맞춤 추천' },
  { to: ANALYSIS_PATH, label: '지역별분석', desc: '구별 시세 · 거래량 통계' },
  { to: MAP_PATH, label: '지도', desc: '실거래 매물 지도' },
  { to: PREDICT_PATH, label: 'AI가격예측', desc: '실거래 학습 모델 예상가' },
  { to: FAVORITES_PATH, label: '관심매물', desc: '저장 · 비교' },
];
