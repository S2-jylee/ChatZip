import { useSyncExternalStore } from 'react';

// "이미 본 매물" — 상세 모달을 연 매물 id 를 이 브라우저에 기억합니다 (서버 저장 X)
const KEY = 'chatzip.viewed';
const listeners = new Set();

const read = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) ?? []); } catch { return new Set(); }
};
let viewed = read();

export function markViewed(id) {
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
