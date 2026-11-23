import { api, USE_MOCK } from './client';
import * as mock from './mock';

/**
 * 선호 조건 (마이페이지 · 맞춤추천에 사용)
 * GET /api/users/me/preferences → { type, deal, gus: ["마포구"], minPrice, maxPrice, minArea, maxArea, maxWalk }
 *  가격·면적 단위: 만원 · ㎡ / 값이 없으면 null. 저장한 적 없으면 모두 null 인 객체
 */
export async function getPreferences() {
  if (USE_MOCK) return mock.getPreferences();
  const { data } = await api.get('/api/users/me/preferences');
  return data;
}

/** PUT /api/users/me/preferences (같은 형태로 통째로 저장) */
export async function savePreferences(prefs) {
  if (USE_MOCK) return mock.savePreferences(prefs);
  const { data } = await api.put('/api/users/me/preferences', prefs);
  return data;
}

/**
 * 내 등록매물 — GET /api/users/me/listings
 * → [{ listingId, name, address, type, areaM2, floor, dealType, price, rent?, status, imageUrl?, createdAt }]
 *  status: PENDING(승인대기) | PUBLISHED(게시중) | REJECTED(반려) | SUSPENDED(게시중지) — 관리자 매물 관리와 같은 값
 */
export async function getMyListings() {
  if (USE_MOCK) return mock.getMyListings();
  const { data } = await api.get('/api/users/me/listings');
  return data;
}
