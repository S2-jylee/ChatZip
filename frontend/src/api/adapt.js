import { cleanParams } from '../utils/format';

/**
 * 1120 API 정리본(대표 API) ↔ 화면 모양 변환은 이 파일 한 곳에서만 합니다.
 * 화면은 기존 매물 모양(aptId, price, gu …)을 그대로 쓰고,
 * 정리본에 응답 필드 이름이 없는 곳은 후보 이름을 차례로 확인합니다 → 백엔드 D 와 확정되면 여기만 수정.
 */

// 정리본: 매물 종류 = propertyType, 매매·전세·월세 = transactionType (값은 Java enum 이름으로 가정 — 확정 필요)
const PROPERTY_TYPE = { apt: 'APT', villa: 'VILLA', oneroom: 'ONEROOM', officetel: 'OFFICETEL', store: 'STORE' };
const TRANSACTION_TYPE = { sale: 'SALE', jeonse: 'JEONSE', monthly: 'MONTHLY' };
const reverse = (map, v) => Object.keys(map).find((k) => map[k] === String(v ?? '').toUpperCase());

export const toPropertyType = (type) => PROPERTY_TYPE[type];
export const toTransactionType = (deal) => TRANSACTION_TYPE[deal];

/** 값이 있는 첫 번째 필드 */
export const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null);

/** 목록 응답 { items, totalCount } (또는 배열 · Spring Page) → 배열 */
export const itemsOf = (data) => (Array.isArray(data) ? data : data?.items ?? data?.content ?? []);

/** 목록 응답 → 매물찾기 화면의 페이지 모양 { content, totalElements, totalPages, page, size } */
export function toPage(data, { page = 0, size = 10 } = {}, map = toListing) {
  const content = itemsOf(data).map(map);
  const total = pick(data, 'totalCount', 'totalElements') ?? content.length;
  return { content, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)), page: Number(page), size: Number(size) };
}

const dealOf = (type, deal) => deal || (['oneroom', 'officetel', 'store'].includes(type) ? 'monthly' : 'sale');

/**
 * 화면 검색 조건 → GET /api/sales · /api/sales/markers 쿼리 (정리본 "검색→지도": 두 API 같은 조건)
 *  금액 만원, 면적 ㎡. 매매면 매매가, 전세·월세면 보증금 범위로 보냄
 *  정리본에 없는 상세 필터(sub, struct, floor, maxWalk …)는 이름 그대로 전달
 */
export function toSalesParams({ type = 'apt', deal, q, gu, minPrice, maxPrice, ...rest } = {}) {
  const d = dealOf(type, deal);
  const money = d === 'sale' ? { minPrice, maxPrice } : { minDeposit: minPrice, maxDeposit: maxPrice };
  return cleanParams({
    ...rest,
    propertyType: toPropertyType(type),
    transactionType: toTransactionType(d),
    keyword: q,
    district: gu,
    ...money,
  });
}

/** 서버 매물(sales) → 화면 매물 */
export function toListing(s) {
  if (!s) return s;
  return {
    ...s,
    aptId: pick(s, 'salesIdx', 'aptId'),
    estIdx: pick(s, 'estIdx'),
    name: pick(s, 'name', 'estateName', 'estName', 'title'),
    type: reverse(PROPERTY_TYPE, s.propertyType) ?? s.type ?? 'apt',
    dealType: reverse(TRANSACTION_TYPE, s.transactionType) ?? s.dealType ?? 'sale',
    price: pick(s, 'price', 'salePrice', 'deposit'),
    rent: pick(s, 'rent', 'monthlyRent'),
    areaM2: pick(s, 'areaM2', 'area', 'exclusiveArea'),
    gu: pick(s, 'gu', 'district'),
    dong: pick(s, 'dong'),
    builtYear: pick(s, 'builtYear', 'buildYear'),
    lat: pick(s, 'lat', 'y', 'latitude'),
    lng: pick(s, 'lng', 'x', 'longitude'),
  };
}

/** 서버 실거래(trades) → 화면 거래 { dealDate, price, rent?, floor, areaM2, builtYear … } */
export function toTrade(t) {
  return {
    ...toListing(t),
    aptId: pick(t, 'salesIdx'), // 실거래는 등록 매물이 아님 → 매물 번호가 있을 때만
    dealDate: pick(t, 'dealDate', 'contractDate', 'tradeDate'),
    price: pick(t, 'price', 'dealAmount', 'deposit'),
  };
}

/** 서버 회원 → 화면 사용자 (자체 가입은 email 이 아이디) */
export function toUser(m) {
  if (!m) return m;
  return {
    ...m,
    userId: pick(m, 'memberIdx', 'userId'),
    loginId: pick(m, 'email', 'loginId'),
    name: pick(m, 'nickname', 'name'),
    role: m.role ?? 'USER',
  };
}

/** YYYY-MM-DD (오늘 기준 n개월 전) */
export function monthsAgo(n, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() - n, from.getDate());
  return ymd(d);
}
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
