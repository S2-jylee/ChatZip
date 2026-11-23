// 서비스 지역: 경기도 성남시 · 용인시 · 수원시 (매물 샘플 기준). 값 = "시 구" → API 쿼리 district 로 그대로 전달
export const REGIONS = [
  '성남시 분당구', '성남시 수정구', '성남시 중원구',
  '용인시 수지구', '용인시 기흥구', '용인시 처인구',
  '수원시 영통구', '수원시 팔달구', '수원시 권선구', '수원시 장안구',
];
export const SERVICE_AREA = '경기도';
export const ALL_REGIONS_LABEL = '전체 지역';
// 지도 처음 위치 (세 시의 가운데) — 매물을 불러오면 매물이 모두 보이게 다시 맞춤
export const SERVICE_CENTER = { lat: 37.33, lng: 127.08 };

export const DATA_SOURCE = '국토교통부 아파트 실거래가 공개시스템';
