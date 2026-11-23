import { useEffect, useRef, useState } from 'react';
import { ALL_REGIONS_LABEL, REGIONS } from '../constants/regions';
import {
  DEFAULT_TYPE, FILTER_KEYS, areaPresetsOf, detailFiltersOf, dealTabsOf, defaultDealOf, pricePresetsOf, priceStepOf, rentPresetsOf,
} from '../constants/propertyTypes';

const EMPTY = Object.fromEntries(FILTER_KEYS.map((k) => [k, '']));

// 버튼에 보여줄 현재 값: "6~9억", "~60㎡", "1천~"
const won = (v) => {
  const n = Number(v);
  if (n >= 10000) return `${+(n / 10000).toFixed(1)}억`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}천`;
  return `${n}`;
};
const rangeText = (min, max, fmt) => {
  if (!min && !max) return '';
  return `${min ? fmt(min) : ''}~${max ? fmt(max) : ''}`;
};

/**
 * 지도 필터 바 — 한 줄짜리 버튼(지역 · 가격 · 월세 · 면적 · 역세권). 좁은 목록 폭에 다 들어가게 화살표 없이 글자만
 * 버튼을 누르면 그 항목만 아래로 펼쳐지는 작은 창(목록 위에 겹쳐 뜸 → 목록이 밀려 내려가지 않음)
 * 칩은 누르는 즉시 적용, 직접 입력은 [적용]
 */
export default function FilterBar({ value, onSubmit, type = DEFAULT_TYPE }) {
  const [form, setForm] = useState({ ...EMPTY, ...value });
  const [open, setOpen] = useState(null); // 'gu' | 'price' | 'rent' | 'area'
  const [error, setError] = useState('');
  const ref = useRef(null);
  const popRef = useRef(null);

  useEffect(() => { setForm({ ...EMPTY, ...value }); }, [value]);
  useEffect(() => { setError(''); }, [open]);

  // 바깥 클릭 · Esc 로 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // 창이 열려 있는 동안 뒤 목록 스크롤 막기 — 창 안의 스크롤 영역(지역 칩 · 상세 조건)이 더 움직일 수 있을 때만 허용
  useEffect(() => {
    if (!open) return undefined;
    const canScroll = (target, dy) => {
      for (let el = target; el && popRef.current?.contains(el); el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          return dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        }
      }
      return false;
    };
    let lastY = 0;
    const onWheel = (e) => { if (!canScroll(e.target, e.deltaY)) e.preventDefault(); };
    const onTouchStart = (e) => { lastY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      const y = e.touches[0].clientY;
      const dy = lastY - y;
      lastY = y;
      if (e.cancelable && !canScroll(e.target, dy)) e.preventDefault();
    };
    const opts = { passive: false };
    document.addEventListener('wheel', onWheel, opts);
    document.addEventListener('touchstart', onTouchStart, opts);
    document.addEventListener('touchmove', onTouchMove, opts);
    return () => {
      document.removeEventListener('wheel', onWheel, opts);
      document.removeEventListener('touchstart', onTouchStart, opts);
      document.removeEventListener('touchmove', onTouchMove, opts);
    };
  }, [open]);

  const hasDeal = dealTabsOf(type).length > 0;
  const deal = form.deal || defaultDealOf(type);
  const priceTitle = hasDeal ? { sale: '매매가', jeonse: '전세금', monthly: '보증금' }[deal] : '가격';
  const showRent = hasDeal && deal === 'monthly';

  const submit = (next) => {
    const bad = (a, b) => next[a] && next[b] && Number(next[a]) > Number(next[b]);
    if (bad('minPrice', 'maxPrice')) return setError(`최소 ${priceTitle}이 최대보다 클 수 없어요.`);
    if (bad('minRent', 'maxRent')) return setError('최소 월세가 최대보다 클 수 없어요.');
    if (bad('minArea', 'maxArea')) return setError('최소 면적이 최대보다 클 수 없어요.');
    setError('');
    onSubmit(next);
    return true;
  };
  const apply = (patch, close = true) => {
    const next = { ...form, ...patch };
    setForm(next);
    if (submit(next) && close) setOpen(null);
  };
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const toggle = (key) => setOpen((o) => (o === key ? null : key));

  // 항목별 설정: 칩 · 직접 입력 단위
  const groups = {
    price: { minKey: 'minPrice', maxKey: 'maxPrice', chips: pricePresetsOf(type, deal), step: priceStepOf(type, deal), unit: '만원', fmt: won },
    rent: { minKey: 'minRent', maxKey: 'maxRent', chips: rentPresetsOf(type), step: 5, unit: '만원/월', fmt: (v) => `${v}` },
    area: { minKey: 'minArea', maxKey: 'maxArea', chips: areaPresetsOf(type), step: 1, unit: '㎡', fmt: (v) => `${v}㎡` },
  };
  const label = { price: priceTitle, rent: '월세', area: '면적' };

  const rangePanel = (key) => {
    const g = groups[key];
    const isOn = (p) => form[g.minKey] === p.min && form[g.maxKey] === p.max;
    return (
      <>
        <div className="chips">
          {g.chips.map((p) => (
            <button key={p.label} type="button" title={p.title} className={`chip${isOn(p) ? ' on' : ''}`} onClick={() => apply({ [g.minKey]: p.min, [g.maxKey]: p.max })}>
              {p.label}
            </button>
          ))}
        </div>
        <form className="fpop-range" onSubmit={(e) => { e.preventDefault(); apply({}); }}>
          <input type="number" name={g.minKey} min="0" step={g.step} placeholder={`최소 (${g.unit})`} value={form[g.minKey]} onChange={change} aria-label={`최소 ${label[key]}`} />
          <span>~</span>
          <input type="number" name={g.maxKey} min="0" step={g.step} placeholder={`최대 (${g.unit})`} value={form[g.maxKey]} onChange={change} aria-label={`최대 ${label[key]}`} />
          <button type="submit" className="btn btn-primary btn-sm">적용</button>
        </form>
      </>
    );
  };

  const items = [
    { key: 'gu', text: form.gu || '지역', tip: form.gu || '지역', on: !!form.gu },
    ...['price', ...(showRent ? ['rent'] : []), 'area'].map((key) => {
      const g = groups[key];
      const v = rangeText(form[g.minKey], form[g.maxKey], g.fmt);
      // 버튼엔 항목 이름만 (값은 눌렀을 때 · 마우스 올리면 보임) → 값을 골라도 버튼 폭이 늘지 않아 한 줄에 다 보임
      return { key, text: label[key], tip: v ? `${label[key]} ${v}` : label[key], on: !!v };
    }),
  ];
  // 상세 필터 (매물 종류별 — constants/propertyTypes.js DETAIL_FILTERS)
  const details = detailFiltersOf(type);
  const detailCount = details.reduce((n, g) => n + (form[g.key] ? String(form[g.key]).split(',').length : 0), 0);
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (open === 'detail') setDraft(Object.fromEntries(details.map((g) => [g.key, form[g.key] ?? ''])));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickDetail = (g, v) => setDraft((d) => {
    if (!g.multi) return { ...d, [g.key]: d[g.key] === v ? '' : v };
    const cur = d[g.key] ? d[g.key].split(',') : [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    return { ...d, [g.key]: next.join(',') };
  });
  const draftOn = (g, v) => (g.multi ? (draft[g.key] || '').split(',').includes(v) : draft[g.key] === v);
  const anyOn = items.some((i) => i.on) || detailCount > 0;

  return (
    <div className="fbar" ref={ref}>
      <div className="fbar-row" role="toolbar" aria-label="필터">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`fbar-btn${it.on ? ' on' : ''}${open === it.key ? ' open' : ''}`}
            aria-expanded={open === it.key}
            title={it.tip}
            onClick={() => toggle(it.key)}
          >
            <span>{it.text}</span>
          </button>
        ))}
        <button
          type="button"
          className={`fbar-btn fbar-detail${detailCount ? ' on' : ''}${open === 'detail' ? ' open' : ''}`}
          aria-expanded={open === 'detail'}
          title="상세 조건"
          onClick={() => toggle('detail')}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          <span>상세</span>
          {detailCount > 0 && <b className="fbar-badge">{detailCount}</b>}
        </button>
        {anyOn && (
          <button
            type="button"
            className="fbar-reset"
            onClick={() => apply({ ...EMPTY, deal: form.deal })}
            aria-label="필터 초기화"
            title="필터 초기화"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div ref={popRef} className={`fpop${open === 'detail' ? ' fpop-detail' : ''}`} role="dialog" aria-label={{ gu: '지역', detail: '상세 조건' }[open] ?? label[open]}>
          <div className="fpop-head">
            <strong>{{ gu: '지역', detail: '상세 조건' }[open] ?? label[open]}</strong>
            <button type="button" className="fpop-close" onClick={() => setOpen(null)} aria-label="닫기">
              {/* × 글자는 글꼴마다 위치가 달라 한쪽으로 치우침 → 선 아이콘으로 정확히 가운데 */}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {open === 'gu' ? (
            <div className="chips fpop-gu">
              <button type="button" className={`chip${!form.gu ? ' on' : ''}`} onClick={() => apply({ gu: '' })}>{ALL_REGIONS_LABEL}</button>
              {REGIONS.map((g) => (
                <button key={g} type="button" className={`chip${form.gu === g ? ' on' : ''}`} onClick={() => apply({ gu: g })}>{g}</button>
              ))}
            </div>
          ) : open === 'detail' ? (
            <>
              <div className="fpop-groups">
                {details.map((g) => (
                  <div key={g.key} className="fpop-group">
                    <span className="fpop-label">{g.label}{g.multi && <small> 여러 개 선택</small>}</span>
                    <div className="chips">
                      {g.options.map(([v, l]) => (
                        <button key={v} type="button" className={`chip${draftOn(g, v) ? ' on' : ''}`} aria-pressed={draftOn(g, v)} onClick={() => pickDetail(g, v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="fpop-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(Object.fromEntries(details.map((g) => [g.key, ''])))}>선택 해제</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => apply(draft)}>적용하기</button>
              </div>
            </>
          ) : rangePanel(open)}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
