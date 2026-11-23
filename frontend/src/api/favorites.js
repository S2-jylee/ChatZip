import { api, USE_MOCK } from './client';
import { itemsOf, pick, toListing } from './adapt';
import * as mock from './mock';

/**
 * GET /api/favorites?sort=&page=&size= → { items, totalCount } (비로그인 401)
 * 반환: [{ favoriteId, createdAt, apartment }]
 */
export async function getFavorites() {
  if (USE_MOCK) return mock.getFavorites();
  const { data } = await api.get('/api/favorites', { params: { page: 0, size: 100 } });
  return itemsOf(data).map((f) => {
    const apartment = toListing(f.sale ?? f.sales ?? f.apartment ?? f);
    return { favoriteId: pick(f, 'favIdx', 'favoriteId') ?? apartment.aptId, createdAt: pick(f, 'createdAt', 'regDate'), apartment };
  });
}

/** POST /api/favorites { salesIdx } (중복이면 409) */
export async function addFavorite(aptId) {
  if (USE_MOCK) return mock.addFavorite(aptId);
  const { data } = await api.post('/api/favorites', { salesIdx: aptId });
  return data;
}

/** DELETE /api/favorites/{salesIdx} — 세션 회원 + 매물 번호로 삭제 */
export async function removeFavorite(aptId) {
  if (USE_MOCK) return mock.removeFavorite(aptId);
  await api.delete(`/api/favorites/${aptId}`);
}
