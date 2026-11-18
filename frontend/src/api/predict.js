import { aiApi, USE_MOCK } from './client';
import * as mock from './mock';

/**
 * POST /predict (FastAPI)
 * 요청: { gu, area_m2, floor, built_year }   ← 학습 컬럼명과 동일 (snake_case)
 * 응답: { predicted_price }                   ← 만원 정수
 * 필드 이름 변환은 이 파일에서만 합니다.
 */
export async function predictPrice({ gu, areaM2, floor, builtYear }) {
  const payload = {
    gu,
    area_m2: Number(areaM2),
    floor: Number(floor),
    built_year: Number(builtYear),
  };
  const data = USE_MOCK ? await mock.predict(payload) : (await aiApi.post('/predict', payload)).data;
  return Math.round(data.predicted_price);
}
