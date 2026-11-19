// 가격은 항상 "만원 정수" 단위로 주고받습니다. (기획서 3.4)

/** 125000 → "12억 5,000만원", 8500 → "8,500만원" */
export function formatPrice(manwon) {
  if (manwon === null || manwon === undefined || Number.isNaN(Number(manwon))) return '—';
  const value = Math.round(Number(manwon));
  const eok = Math.floor(value / 10000);
  const rest = value % 10000;
  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만원`;
  if (rest === 0) return `${eok}억`;
  return `${eok}억 ${rest.toLocaleString('ko-KR')}만원`;
}

/** 84.97 → "84.97㎡ (약 26평)" */
export function formatArea(m2) {
  if (m2 === null || m2 === undefined) return '—';
  const n = Number(m2);
  return `${n.toFixed(2)}㎡ (약 ${Math.round(n / 3.3058)}평)`;
}

/** "2024-03-15" → "2024.03.15" */
export function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10).replaceAll('-', '.');
}

/** 실거래가와 예상가 차이 (%) — 양수면 실거래가가 더 비쌈 */
export function priceGapPercent(actual, predicted) {
  if (!actual || !predicted) return null;
  return ((actual - predicted) / predicted) * 100;
}

/** 카드용 짧은 가격: 135000 → "13억 5,000", 90000 → "9억", 8500 → "8,500만" (단위 만원) */
export function formatPriceCompact(manwon) {
  if (manwon === null || manwon === undefined || Number.isNaN(Number(manwon))) return '—';
  const value = Math.round(Number(manwon));
  const eok = Math.floor(value / 10000);
  const rest = value % 10000;
  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만`;
  return rest === 0 ? `${eok}억` : `${eok}억 ${rest.toLocaleString('ko-KR')}`;
}

/** 목록 배지용 AI 판정: 적정가(±5%) · 저평가 · 고평가 */
export const AI_BADGE = { fair: 'AI 적정가', low: 'AI 저평가', high: 'AI 고평가' };

/** 예상가 대비 판정: ±5% 이내 적정 */
export function verdictOf(actual, predicted) {
  const gap = priceGapPercent(actual, predicted);
  if (gap === null) return null;
  if (gap > 5) return { kind: 'high', gap, label: `예상가보다 ${gap.toFixed(1)}% 높음` };
  if (gap < -5) return { kind: 'low', gap, label: `예상가보다 ${Math.abs(gap).toFixed(1)}% 낮음` };
  return { kind: 'fair', gap, label: '예상가와 비슷한 적정 수준' };
}

/** 마커용 짧은 가격: 125000 → "12.5억", 8500 → "8500만" */
export function shortPrice(manwon) {
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(1).replace(/\.0$/, '')}억`;
  return `${manwon}만`;
}

/**
 * 거래 종류에 맞는 가격 표기. dealType: sale(매매가) | jeonse(보증금) | monthly(보증금 price + 월세 rent)
 * 월세: "1,000만원 / 월 55만원"
 */
export function formatDealPrice(apt) {
  if (apt?.dealType === 'monthly') return `${formatPrice(apt.price)} / 월 ${Number(apt.rent).toLocaleString('ko-KR')}만원`;
  return formatPrice(apt?.price);
}
/** 마커·축약용: 월세 "1000/55", 그 외 shortPrice */
export function shortDealPrice(apt) {
  if (apt?.dealType === 'monthly') return `${apt.price}/${apt.rent}`;
  return shortPrice(apt.price);
}
/** 거래 종류 이름: 매매 · 전세 · 월세 */
export const dealLabel = (dealType) => ({ jeonse: '전세', monthly: '월세' }[dealType] ?? '매매');

/** 직선거리(m) → 도보 분. 실제 길은 직선보다 약 1.3배 길고, 걷는 속도 분당 80m 로 계산 */
export function walkMinutes(distanceM) {
  if (distanceM == null) return null;
  return Math.max(1, Math.ceil((Number(distanceM) * 1.3) / 80));
}
/** "망원역 도보 7분" */
export function stationText(st) {
  if (!st) return null;
  return `${st.name} 도보 ${walkMinutes(st.distanceM)}분`;
}
/** 준공 5년 이내 = 신축 */
export const isNewBuild = (builtYear, now = new Date().getFullYear()) => builtYear != null && now - Number(builtYear) <= 5;

/** 평당가 (만원) */
export function perPyeong(price, areaM2) {
  return Math.round(price / (Number(areaM2) / 3.3058));
}

/** 가격대 구분 — 마커 색과 범례에 사용 */
export const PRICE_TIERS = [
  { key: 'low', label: '6억 미만', max: 60000 },
  { key: 'mid', label: '6 ~ 12억', max: 120000 },
  { key: 'high', label: '12 ~ 20억', max: 200000 },
  { key: 'top', label: '20억 이상', max: Infinity },
];
export function tierOf(price) {
  return PRICE_TIERS.find((t) => price < t.max).key;
}

/** 매물 배열 → 구별 평균 평당가 · 거래 수 */
export function statsByGu(apartments) {
  const map = new Map();
  apartments.forEach((a) => {
    const s = map.get(a.gu) ?? { gu: a.gu, count: 0, sum: 0 };
    s.count += 1;
    s.sum += perPyeong(a.price, a.areaM2);
    map.set(a.gu, s);
  });
  return [...map.values()]
    .map((s) => ({ gu: s.gu, count: s.count, avgPerPyeong: Math.round(s.sum / s.count) }))
    .sort((x, y) => y.avgPerPyeong - x.avgPerPyeong);
}

/** 빈 문자열/undefined 를 제거해 쿼리 파라미터로 보낼 객체를 만듭니다. */
export function cleanParams(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
}
