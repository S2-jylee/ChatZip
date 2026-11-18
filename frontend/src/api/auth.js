import { api, USE_MOCK } from './client';
import * as mock from './mock';

/** GET /api/auth/me — 로그인 상태면 사용자, 아니면 401 */
export async function fetchMe() {
  if (USE_MOCK) return mock.me();
  const { data } = await api.get('/api/auth/me');
  return data;
}

/** POST /api/auth/login { loginId, password } */
export async function login(loginId, password) {
  if (USE_MOCK) return mock.login(loginId, password);
  const { data } = await api.post('/api/auth/login', { loginId, password });
  return data;
}

/** POST /api/auth/signup { loginId, password, name } */
export async function signup(form) {
  if (USE_MOCK) return mock.signup(form);
  const { data } = await api.post('/api/auth/signup', form);
  return data;
}

/** POST /api/auth/logout */
export async function logout() {
  if (USE_MOCK) return mock.logout();
  await api.post('/api/auth/logout');
}
