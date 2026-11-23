import { api, USE_MOCK } from './client';
import { toUser } from './adapt';
import * as mock from './mock';

/** GET /api/members/me — 로그인 상태면 사용자, 아니면 401 */
export async function fetchMe() {
  if (USE_MOCK) return mock.me();
  const { data } = await api.get('/api/members/me');
  return toUser(data);
}

/**
 * POST /api/auth/login { email, password } → 세션
 * 화면의 아이디 입력값을 email 로 보냄. 응답에 회원 정보가 없으면 /api/members/me 로 확인
 */
export async function login(loginId, password) {
  if (USE_MOCK) return mock.login(loginId, password);
  const { data } = await api.post('/api/auth/login', { email: loginId, password });
  return data && typeof data === 'object' ? toUser(data) : fetchMe();
}

/** POST /api/members { email, password, nickname } → 201 (중복이면 409) */
export async function signup(form) {
  if (USE_MOCK) return mock.signup(form);
  const { data } = await api.post('/api/members', { email: form.loginId, password: form.password, nickname: form.name });
  return toUser(data);
}

/** POST /api/auth/logout (세션 + CSRF 토큰) */
export async function logout() {
  if (USE_MOCK) return mock.logout();
  await api.post('/api/auth/logout');
}

/**
 * 카카오 로그인 · 가입 (같은 흐름: 처음 들어온 카카오 계정이면 서버가 회원을 새로 만듦)
 * 실제: 백엔드 Spring Security OAuth2 → GET {API}/oauth2/authorization/kakao 로 이동,
 *       카카오 동의 후 백엔드가 세션을 만들고 redirect 로 프론트에 돌려보냄 (카카오 로그인 API ✅ 무료)
 * 목업: 카카오 사용자로 바로 로그인
 */
export async function kakaoLogin() {
  if (USE_MOCK) return mock.kakaoLogin();
  const back = encodeURIComponent(window.location.href);
  window.location.href = `${api.defaults.baseURL}/oauth2/authorization/kakao?redirect=${back}`;
  return new Promise(() => {}); // 페이지가 이동하므로 끝나지 않음
}
