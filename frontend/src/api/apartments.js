import { api, USE_MOCK } from './client';
import { cleanParams } from '../utils/format';
import * as mock from './mock';

/**
 * GET /api/apartments?type=&deal=&q=&gu=&minPrice=&maxPrice=&minRent=&maxRent=&minArea=&maxArea=&maxWalk=
 *  - deal: sale(매매) | jeonse(전세) | monthly(월세). 빌라·원룸만 사용, 없으면 빌라 sale · 원룸 monthly
 *  - minPrice/maxPrice: 매매가 또는 보증금 (만원) · minRent/maxRent: 월세 (만원)
 *  - q: 검색어 — 단지명 · 주소(구 · 동) 부분 일치 (지도 상단 검색창)
 *  - maxWalk: 가까운 지하철역까지 도보 N분 이내 (직선거리 × 1.3 ÷ 분당 80m)
 * 응답: Apartment[]  (필드: README "API 계약" 참고)
 *  빌라·원룸 추가 필드:
 *   dealType: "sale" | "jeonse" | "monthly"
 *   rent?: 월세 만원 (monthly 일 때)
 *   nearestStation?: { name: "망원역", distanceM: 540 }  — 공공 역 좌표 데이터로 서버에서 직선거리 계산 (카카오 길찾기 쓰지 않음)
 *   landAreaM2?: 대지권 면적 (빌라 매매, 연립다세대 실거래 자료)
 *   violation?: true | false | null  — 위반건축물 여부 (건축물대장, null = 확인 불가)
 */
export async function searchApartments(filters = {}) {
  if (USE_MOCK) return mock.searchApartments(cleanParams(filters));
  const { data } = await api.get('/api/apartments', { params: cleanParams(filters) });
  return data;
}

/** GET /api/apartments/{id}  — 없으면 404 */
export async function getApartment(id) {
  if (USE_MOCK) return mock.getApartment(id);
  const { data } = await api.get(`/api/apartments/${id}`);
  return data;
}

/**
 * GET /api/apartments/{id}/deals?months=12  — 같은 단지·같은 면적·같은 거래 종류의 최근 실거래 내역
 * 응답: { baseDate: "YYYY-MM-DD", deals: [{ dealDate, price, rent?, floor }] }  (가격 만원, 날짜 오름차순)
 *  매매: price = 매매가 · 전세: price = 보증금 · 월세: price = 보증금, rent = 월세
 */
export async function getDeals(id, months = 12) {
  if (USE_MOCK) return mock.getDeals(id, months);
  const { data } = await api.get(`/api/apartments/${id}/deals`, { params: { months } });
  return data;
}

/**
 * GET /api/apartments/{id}/jeonse-ratio  — 빌라 전세가율 (같은 건물·비슷한 면적, 최근 1년 매매·전세 실거래 중간값)
 * 응답: { salePrice, jeonsePrice, ratio: 82.5, saleCount, jeonseCount, baseDate }  · 비교할 거래가 없으면 404
 * 데이터: 국토부 연립다세대 매매 + 전월세 실거래 (공공데이터포털, 무료)
 */
export async function getJeonseRatio(id) {
  if (USE_MOCK) return mock.getJeonseRatio(id);
  const { data } = await api.get(`/api/apartments/${id}/jeonse-ratio`);
  return data;
}

/**
 * GET /api/apartments/{id}/boundary  — 단지 영역(필지) 테두리
 * 응답: GeoJSON Polygon { type: "Polygon", coordinates: [[[경도, 위도], ...]] }  · 없으면 404
 * 백엔드: 브이월드(V-World) 연속지적도 API 로 매물 좌표의 필지 경계를 받아 전달 (키는 서버에만)
 */
const boundaryCache = new Map();
export async function getBoundary(id) {
  if (boundaryCache.has(id)) return boundaryCache.get(id);
  const data = USE_MOCK ? await mock.getBoundary(id) : (await api.get(`/api/apartments/${id}/boundary`)).data;
  boundaryCache.set(id, data);
  return data;
}

/** GET /api/recommend?gu=&maxPrice=&minArea=&minBuiltYear=  — 상위 10건 */
export async function getRecommendations(conditions = {}) {
  if (USE_MOCK) return mock.getRecommendations(cleanParams(conditions));
  const { data } = await api.get('/api/recommend', { params: cleanParams(conditions) });
  return data;
}

/**
 * GET /api/apartments/popular?limit=5  — 실시간 인기 매물 (메인 TOP 5)
 * 인기 기준: 최근 7일 상세 조회 수 (조회 로그) — 팀 확정 필요
 * 응답: Apartment[] + viewCount (많은 순)
 */
export async function getPopular(limit = 5) {
  if (USE_MOCK) return mock.getPopular(limit);
  const { data } = await api.get('/api/apartments/popular', { params: { limit } });
  return data;
}

/**
 * GET /api/apartments/search  — 매물찾기 (조건 검색 + 정렬 + 페이지)
 * 쿼리: gu, minPrice, maxPrice, minArea, maxArea, minBuiltYear, maxWalk, q(단지명), sort, page(0부터), size
 *  sort: recent(최신 거래순) | priceAsc | priceDesc | ppyAsc(평당가 낮은순) | areaDesc
 * 응답 (Spring Page 형태): { content: Apartment[], totalElements, totalPages, page, size }
 * 백엔드: JPA Specification(또는 QueryDSL) 동적 조건 + Pageable
 */
export async function searchPaged(params = {}) {
  if (USE_MOCK) return mock.searchPaged(cleanParams(params));
  const { data } = await api.get('/api/apartments/search', { params: cleanParams(params) });
  return data;
}
