import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/** 지금 화면 주소에 ?detail={id} 를 붙인 링크 → 화면은 그대로, 상세 모달만 열림 */
export function useDetailHref() {
  const { pathname, search } = useLocation();
  return useCallback((id) => {
    const p = new URLSearchParams(search);
    p.set('detail', id);
    return `${pathname}?${p.toString()}`;
  }, [pathname, search]);
}
