import { useSyncExternalStore } from 'react';

// "이미 본 매물" — 상세 모달을 연 매물 id 와 본 시각을 이 브라우저에 기억합니다 (서버 저장 X)
const KEY = 'chatzip.viewed';
const AT_KEY = 'chatzip.viewedAt'; // { id: 본 시각(ms) } — 마이페이지 "최근 본 매물"
const listeners = new Set();

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
let viewed = new Set(read(KEY, []));
let viewedAt = read(AT_KEY, {});

export function markViewed(id) {
  viewedAt = { ...viewedAt, [id]: Date.now() };
  try { localStorage.setItem(AT_KEY, JSON.stringify(viewedAt)); } catch { /* 무시 */ }
  if (viewed.has(id)) return;
  viewed = new Set(viewed).add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...viewed].slice(-500))); } catch { /* 무시 */ }
  listeners.forEach((fn) => fn());
}

/** 본 매물 id Set (바뀌면 다시 렌더) */
export function useViewed() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => viewed,
  );
}

/** 최근 본 순서 [{ id, at }] — 시각이 없는 예전 기록은 뒤로 */
export function recentViewed() {
  return [...viewed].map((id) => ({ id, at: viewedAt[id] ?? 0 })).sort((a, b) => b.at - a.at);
}
