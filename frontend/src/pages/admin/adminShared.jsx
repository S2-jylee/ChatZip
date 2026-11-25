import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import { REGIONS } from '../../constants/regions';

// 서비스 지역 "시 구" → 시 목록 · 시별 구 목록
export const CITIES = [...new Set(REGIONS.map((r) => r.split(' ')[0]))];
export const districtsOf = (city) => REGIONS.filter((r) => r.startsWith(`${city} `)).map((r) => r.split(' ')[1]);

/** 125000 → "12억 5,000" (단위 만원) */
export function priceText(manwon) {
  if (manwon == null) return '—';
  const v = Math.round(Number(manwon));
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만`;
  return rest === 0 ? `${eok}억` : `${eok}억 ${rest.toLocaleString('ko-KR')}`;
}
export const areaText = (m2) => (m2 == null ? '—' : `${Math.round(Number(m2))}㎡`);

/** 페이지 버튼: 처음 · 현재 앞뒤 2개 · 끝, 사이가 비면 '…' (0부터) */
function pageItems(current, total) {
  const pages = new Set([0, total - 1]);
  for (let i = current - 2; i <= current + 2; i += 1) if (i >= 0 && i < total) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    const gap = i > 0 ? p - sorted[i - 1] : 1;
    if (gap === 2) items.push(p - 1);
    else if (gap > 2) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export function Pager({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pager admin-pager" aria-label="페이지">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="이전 페이지"><Icon name="chevronLeft" /></button>
      {pageItems(page, totalPages).map((i) => (typeof i === 'string'
        ? <span key={i} className="pager-gap" aria-hidden="true">…</span>
        : <button key={i} type="button" className={i === page ? 'on' : ''} aria-current={i === page ? 'page' : undefined} aria-label={`${i + 1}페이지`} onClick={() => onPage(i)}>{i + 1}</button>
      ))}
      <button type="button" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} aria-label="다음 페이지"><Icon name="chevronRight" /></button>
    </nav>
  );
}

/** 모바일 카드의 ⋮ 메뉴 — items: [{ label, onClick, danger }] */
export function RowMenu({ name, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="row-menu" ref={ref}>
      <button type="button" className="row-menu-btn" aria-label={`${name} 관리 메뉴`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
      </button>
      {open && (
        <div className="row-menu-pop" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : undefined} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
