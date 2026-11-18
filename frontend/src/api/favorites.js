import { api, USE_MOCK } from './client';
import * as mock from './mock';

/** GET /api/favorites → [{ favoriteId, createdAt, apartment: Apartment }] (비로그인 401) */
export async function getFavorites() {
  if (USE_MOCK) return mock.getFavorites();
  const { data } = await api.get('/api/favorites');
  return data;
}

/** POST /api/favorites { aptId } (중복이면 409) */
export async function addFavorite(aptId) {
  if (USE_MOCK) return mock.addFavorite(aptId);
  const { data } = await api.post('/api/favorites', { aptId });
  return data;
}

/** DELETE /api/favorites/{aptId} */
export async function removeFavorite(aptId) {
  if (USE_MOCK) return mock.removeFavorite(aptId);
  await api.delete(`/api/favorites/${aptId}`);
}
