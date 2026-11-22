// 상단 · 하단 · 모바일 메뉴 (한 곳에서 관리)
// DB가 아파트 실거래 데이터만 있으므로, 매물 종류별 메뉴 대신 "기능(=백엔드 API)" 단위로 메뉴를 나눔
// 매물 종류(아파트 · 빌라 · 원룸 · 오피스텔 · 상가)는 지도 화면 안의 탭으로 (아파트 외는 샘플 데이터)
export const MAP_PATH = '/map';

export const MAIN_MENUS = [
  { to: '/', label: '홈', end: true },
  { to: '/search', label: '매물찾기', desc: '조건 검색 · 맞춤 추천' },
  { to: '/analysis', label: '지역별분석', desc: '구별 시세 · 거래량 통계' },
  { to: MAP_PATH, label: '지도', desc: '실거래 매물 지도' },
  { to: '/predict', label: 'AI가격예측', desc: '실거래 학습 모델 예상가' },
  { to: '/favorites', label: '관심매물', desc: '저장 · 비교' },
];
