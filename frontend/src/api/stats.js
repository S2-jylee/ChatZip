import { api, USE_MOCK } from './client';
import * as mock from './mock';

/**
 * GET /api/stats/gu  — 서울 25개 구 시세 요약 (지역별분석 · 메인)
 * 응답: [{ gu, count, avgPrice, avgPerPyeong, minPrice, maxPrice }]   (만원, 평당가 = 가격 ÷ (전용㎡ ÷ 3.3058))
 * 백엔드: 아파트 실거래 테이블 GROUP BY 구 (최근 12개월)
 */
export async function getGuStats() {
  if (USE_MOCK) return mock.getGuStats();
  const { data } = await api.get('/api/stats/gu');
  return data;
}

/**
 * GET /api/stats/gu/{gu}  — 한 구의 상세 통계
 * 응답: {
 *   gu, count, avgPrice, avgPerPyeong, avgBuiltYear, seoulAvgPerPyeong, rank,   // rank = 평당가 순위 (1 = 가장 비쌈)
 *   byArea:  [{ label: '60㎡ 이하', count, avgPrice, avgPerPyeong }],          // 소형 · 중소형 · 중형 · 대형
 *   byAge:   [{ label: '5년 이내', count, avgPerPyeong }],                     // 준공 경과연수 구간
 *   recent:  Apartment[] (최근 거래 5건)
 * }  · 없는 구면 404
 */
export async function getGuDetail(gu) {
  if (USE_MOCK) return mock.getGuDetail(gu);
  const { data } = await api.get(`/api/stats/gu/${encodeURIComponent(gu)}`);
  return data;
}
