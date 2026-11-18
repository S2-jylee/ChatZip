import axios from 'axios';

// 서버 주소는 .env 한 곳에서만 관리합니다. (기획서 11.1)
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** Spring Boot (:8080) — 세션 쿠키를 보내야 하므로 withCredentials 필수 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
  timeout: 10000,
});

/** FastAPI (:8000) — 로그인 불필요 */
export const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_URL || 'http://localhost:8000',
  timeout: 5000,
});

export function statusOf(err) {
  return err?.response?.status ?? null;
}

/** 사용자에게 보여줄 오류 문구 */
export function errorMessage(err, fallback = '요청 중 오류가 발생했습니다.') {
  const data = err?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data?.message) return data.message;
  if (typeof data?.detail === 'string') return data.detail; // FastAPI 기본 오류 형식
  if (err?.code === 'ERR_NETWORK') return '서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.';
  if (err?.code === 'ECONNABORTED') return '응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요.';
  return fallback;
}
