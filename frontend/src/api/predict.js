import { api, USE_MOCK } from './client';
import { pick } from './adapt';
import * as mock from './mock';

/**
 * POST /api/price-estimates (Spring → FastAPI /predict, 정리본 "추천·예측": 프론트는 FastAPI 를 직접 부르지 않음)
 * 요청: 직접 입력한 조건 { region, area, floor, year }  (FastAPI 학습 입력과 같은 이름 — 확정 필요)
 * 응답: 예상가 · 단위 · 기준일 → 만원 정수만 반환
 */
export async function predictPrice({ gu, areaM2, floor, builtYear }) {
  if (USE_MOCK) {
    const data = await mock.predict({ gu, area_m2: Number(areaM2), floor: Number(floor), built_year: Number(builtYear) });
    return Math.round(data.predicted_price);
  }
  const { data } = await api.post('/api/price-estimates', {
    region: gu,
    area: Number(areaM2),
    floor: Number(floor),
    year: Number(builtYear),
  });
  return Math.round(pick(data, 'estimatedPrice', 'predictedPrice', 'price', 'predicted_price'));
}
