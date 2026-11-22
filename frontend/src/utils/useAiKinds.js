import { useEffect, useState } from 'react';
import { predictPrice } from '../api/predict';
import { verdictOf } from './format';

// AI 예상가는 매매가 기준 → 전세·월세 매물은 판정하지 않음
const isSale = (apt) => !apt.dealType || apt.dealType === 'sale';

/** 매물마다 AI 예상가를 받아 { aptId: 'fair' | 'low' | 'high' } (실패한 매물은 빠짐) */
export function useAiKinds(apartments) {
  const [kinds, setKinds] = useState({});
  useEffect(() => {
    let cancelled = false;
    apartments.forEach((a) => {
      if (!isSale(a) || kinds[a.aptId]) return;
      predictPrice(a)
        .then((predicted) => {
          const kind = verdictOf(a.price, predicted)?.kind;
          if (!cancelled && kind) setKinds((m) => ({ ...m, [a.aptId]: kind }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [apartments]); // eslint-disable-line react-hooks/exhaustive-deps
  return kinds;
}
