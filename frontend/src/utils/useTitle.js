import { useEffect } from 'react';

const SITE = 'ChatZip';
const DEFAULT_TITLE = 'ChatZip · AI 부동산 매물 추천'; // index.html 과 같게

/** 브라우저 탭 제목 — 페이지마다 "매물찾기 · ChatZip". title 이 비면(로딩 중 등) 기본 제목 */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : DEFAULT_TITLE;
  }, [title]);
}
