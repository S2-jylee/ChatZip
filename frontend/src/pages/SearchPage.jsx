import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AptListItem from '../components/AptListItem';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { searchPaged } from '../api/apartments';
import { errorMessage } from '../api/client';
import { ALL_REGIONS_LABEL, REGIONS } from '../constants/regions';
import { areaPresetsOf, pricePresetsOf } from '../constants/propertyTypes';
import { formatPrice } from '../utils/format';
import RecommendPage from './RecommendPage';
import { scrollBehavior } from '../utils/motion';
import { useTitle } from '../utils/useTitle';

const FILTER_KEYS = ['q', 'gu', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'minBuiltYear', 'maxWalk'];
const SORTS = [
  ['recent', '최신 거래순'],
  ['priceAsc', '낮은 가격순'],
  ['priceDesc', '높은 가격순'],
  ['ppyAsc', '평당가 낮은순'],
  ['areaDesc', '넓은 면적순'],
];
const TABS = [
  ['search', '조건 검색'],
  ['recommend', '맞춤 추천'],
];
// 가격 · 면적 칩은 지도 필터와 같은 값 (constants/propertyTypes.js)
const PRICE_CHIPS = pricePresetsOf('apt', 'sale');
const AREA_CHIPS = areaPresetsOf('apt');
const WALK_OPTIONS = [['', '상관없음'], ['5', '도보 5분'], ['10', '도보 10분'], ['15', '도보 15분']];

const PYEONG = 3.3058;
const toPyeong = (m2) => Math.round(Number(m2) / PYEONG);

/** 범위 글자: "5억 ~ 8억", "9억 이하", "5억 이상" */
function rangeText(min, max, fmt) {
  if (min && max) return `${fmt(min)} ~ ${fmt(max)}`;
  if (max) return `${fmt(max)} 이하`;
  if (min) return `${fmt(min)} 이상`;
  return '';
}
const priceText = (min, max) => rangeText(min, max, formatPrice);
const areaText = (min, max) => rangeText(min, max, (v) => `${v}㎡`);
const pyeongText = (min, max) => rangeText(min, max, (v) => `약 ${toPyeong(v)}평`);

/** 페이지 버튼: 처음 · 현재 앞뒤 2개 · 끝, 사이가 비면 '…' (0부터 시작하는 번호) */
function pageItems(current, total) {
  const pages = new Set([0, total - 1]);
  for (let i = current - 2; i <= current + 2; i += 1) if (i >= 0 && i < total) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    const gap = i > 0 ? p - sorted[i - 1] : 1;
    if (gap === 2) items.push(p - 1); // 한 칸만 비면 '…' 대신 그 번호
    else if (gap > 2) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

const pick = (params) => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));

/**
 * 위쪽 필터 바 — [단지명 · 동 검색] [지역] [가격] [면적] [상세] [초기화]
 * 지도 필터 바와 같은 모양: 버튼을 누르면 그 아래 작은 창. 칩은 누르는 즉시 적용, 직접 입력은 [적용]
 * 보내는 조건은 예전 왼쪽 검색 창과 같은 키 (q · gu · minPrice … maxWalk)
 */
function SearchFilterBar({ applied, onApply }) {
  const [open, setOpen] = useState(null); // 'gu' | 'price' | 'area' | 'detail'
  const [draft, setDraft] = useState(applied);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const key = FILTER_KEYS.map((k) => applied[k]).join('|');

  useEffect(() => { setDraft(applied); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  // 창을 열 때마다 적용된 값으로 다시 맞춤 (입력 중인 검색어는 유지)
  useEffect(() => { setError(''); if (open) setDraft((d) => ({ ...applied, q: d.q })); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 바깥 클릭 · Esc 로 닫기 (Esc 는 누른 버튼으로 초점 되돌림)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(null); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      ref.current?.querySelector(`[data-filter="${open}"]`)?.focus();
      setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const apply = (patch) => {
    const next = { ...draft, ...patch };
    const bad = (a, b) => next[a] && next[b] && Number(next[a]) > Number(next[b]);
    if (bad('minPrice', 'maxPrice')) return setError('최소 가격이 최대보다 클 수 없어요.');
    if (bad('minArea', 'maxArea')) return setError('최소 면적이 최대보다 클 수 없어요.');
    setOpen(null);
    return onApply(next);
  };
  const change = (e) => setDraft((d) => ({ ...d, [e.target.name]: e.target.value }));
  const toggle = (k) => setOpen((o) => (o === k ? null : k));

  const priceV = rangeText(applied.minPrice, applied.maxPrice, formatPrice);
  const areaV = areaText(applied.minArea, applied.maxArea);
  const detailCount = (applied.minBuiltYear ? 1 : 0) + (applied.maxWalk ? 1 : 0);
  const items = [
    { k: 'gu', label: '지역', value: applied.gu },
    { k: 'price', label: '가격', value: priceV },
    { k: 'area', label: '면적', value: areaV },
  ];
  const anyOn = FILTER_KEYS.some((k) => applied[k]);

  const rangePanel = (chips, minKey, maxKey, unit, step, hint) => {
    const isOn = (c) => draft[minKey] === c.min && draft[maxKey] === c.max;
    return (
      <>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.label} type="button" title={c.title} className={`chip${isOn(c) ? ' on' : ''}`} aria-pressed={isOn(c)} onClick={() => apply({ [minKey]: c.min, [maxKey]: c.max })}>
              {c.label}
            </button>
          ))}
        </div>
        <form className="fpop-range" onSubmit={(e) => { e.preventDefault(); apply({}); }}>
          <input type="number" name={minKey} min="0" step={step} placeholder={`최소 (${unit})`} value={draft[minKey]} onChange={change} aria-label={`최소 (${unit})`} />
          <span>~</span>
          <input type="number" name={maxKey} min="0" step={step} placeholder={`최대 (${unit})`} value={draft[maxKey]} onChange={change} aria-label={`최대 (${unit})`} />
          <button type="submit" className="btn btn-primary btn-sm">적용</button>
        </form>
        <small className="field-hint" aria-live="polite">{hint}</small>
      </>
    );
  };

  const panels = {
    gu: (
      <div className="chips">
        <button type="button" className={`chip${!draft.gu ? ' on' : ''}`} aria-pressed={!draft.gu} onClick={() => apply({ gu: '' })}>{ALL_REGIONS_LABEL}</button>
        {REGIONS.map((g) => (
          <button key={g} type="button" className={`chip${draft.gu === g ? ' on' : ''}`} aria-pressed={draft.gu === g} onClick={() => apply({ gu: g })}>{g}</button>
        ))}
      </div>
    ),
    price: rangePanel(PRICE_CHIPS, 'minPrice', 'maxPrice', '만원', 1000,
      priceText(draft.minPrice, draft.maxPrice) ? `= ${priceText(draft.minPrice, draft.maxPrice)}` : '1억 = 10000만원'),
    area: rangePanel(AREA_CHIPS, 'minArea', 'maxArea', '㎡', 1,
      pyeongText(draft.minArea, draft.maxArea) ? `전용 = ${pyeongText(draft.minArea, draft.maxArea)}` : '1평 ≈ 3.3㎡ · 전용 84㎡ ≈ 25평'),
    detail: (
      <>
        <div className="fpop-group">
          <span className="fpop-label" id="f-walk">역세권 <small>가까운 지하철역까지</small></span>
          <div className="chips" role="group" aria-labelledby="f-walk">
            {WALK_OPTIONS.map(([v, l]) => (
              <button key={l} type="button" className={`chip${draft.maxWalk === v ? ' on' : ''}`} aria-pressed={draft.maxWalk === v} onClick={() => setDraft((d) => ({ ...d, maxWalk: v }))}>{l}</button>
            ))}
          </div>
        </div>
        <label className="fpop-group">
          <span className="fpop-label">준공연도 <small>이 해 이후 지은 단지</small></span>
          <input className="fpop-input" type="number" name="minBuiltYear" min="1960" max="2030" placeholder="예: 2010" value={draft.minBuiltYear} onChange={change} />
        </label>
        <div className="fpop-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft((d) => ({ ...d, maxWalk: '', minBuiltYear: '' }))}>선택 해제</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => apply({})}>적용하기</button>
        </div>
      </>
    ),
  };
  const titles = { gu: '지역', price: '가격 (매매가)', area: '전용면적', detail: '상세 조건' };

  const popover = (k) => open === k && (
    <div className={`spop${k === 'detail' ? ' spop-right' : ''}`} role="dialog" aria-label={titles[k]}>
      <div className="fpop-head">
        <strong>{titles[k]}</strong>
        <button type="button" className="fpop-close" onClick={() => setOpen(null)} aria-label="닫기"><Icon name="x" size={18} /></button>
      </div>
      {panels[k]}
      {error && <p className="form-error">{error}</p>}
    </div>
  );

  return (
    <div className="sbar" ref={ref}>
      {/* [입력칸] [검색] — 버튼은 입력칸 밖에 같은 높이로 (메인 검색창과 같은 배치) */}
      <form className="sbar-search" role="search" onSubmit={(e) => { e.preventDefault(); apply({}); }}>
        <div className="sbar-input">
          <Icon name="search" size={18} />
          <input name="q" value={draft.q} onChange={change} placeholder="단지명이나 동 이름 (예: 래미안, 정자동)" aria-label="단지명 · 동 검색" />
          {draft.q && (
            <button type="button" className="sbar-clear" onClick={() => apply({ q: '' })} aria-label="검색어 지우기"><Icon name="x" size={16} /></button>
          )}
        </div>
        <button type="submit" className="btn btn-primary sbar-submit">검색</button>
      </form>
      <div className="sbar-row" role="toolbar" aria-label="검색 조건">
        {items.map((it) => (
          <div key={it.k} className="sbar-item">
            <button
              type="button"
              data-filter={it.k}
              className={`sbar-btn${it.value ? ' on' : ''}${open === it.k ? ' open' : ''}`}
              aria-expanded={open === it.k}
              aria-haspopup="dialog"
              onClick={() => toggle(it.k)}
            >
              <span className="sbar-label">{it.label}</span>
              {it.value && <span className="sbar-value">{it.value}</span>}
              <Icon name="chevronDown" size={14} />
            </button>
            {popover(it.k)}
          </div>
        ))}
        <div className="sbar-item">
          <button
            type="button"
            data-filter="detail"
            className={`sbar-btn${detailCount ? ' on' : ''}${open === 'detail' ? ' open' : ''}`}
            aria-expanded={open === 'detail'}
            aria-haspopup="dialog"
            onClick={() => toggle('detail')}
          >
            <Icon name="sliders" size={14} />
            <span className="sbar-label">상세 조건</span>
            {detailCount > 0 && <b className="sbar-badge">{detailCount}</b>}
          </button>
          {popover('detail')}
        </div>
        {anyOn && (
          <button type="button" className="sbar-reset" onClick={() => onApply(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))}>
            조건 초기화
          </button>
        )}
      </div>
    </div>
  );
}

/** 조건 검색 — 필터 · 정렬 · 페이지가 모두 주소(?gu=…&sort=…&page=…)에 남아 새로고침 · 공유해도 그대로 */
function ConditionSearch() {
  const [params, setParams] = useSearchParams();
  const applied = pick(params);
  const sort = params.get('sort') || 'recent';
  const page = Number(params.get('page')) || 0;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // "다시 시도" — 주소가 그대로여도 다시 불러오기
  const key = params.toString();

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    searchPaged({ ...pick(params), sort, page, size: 10 })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, '매물을 불러오지 못했습니다.')); });
    return () => { cancelled = true; };
  }, [key, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next) => {
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v !== '' && v != null && !(k === 'page' && !v) && !(k === 'sort' && v === 'recent')) p.set(k, v); });
    setParams(p);
  };
  const applyFilters = (next) => update({ ...next, sort, page: 0 });
  const reset = () => update({ sort });
  const removeApplied = (keys) => update({ ...applied, ...Object.fromEntries(keys.map((k) => [k, ''])), sort, page: 0 });
  const goPage = (n) => { update({ ...applied, sort, page: n }); window.scrollTo({ top: 0, behavior: scrollBehavior() }); };
  const anyOn = FILTER_KEYS.some((k) => applied[k]);

  let content;
  if (error) content = <ErrorBox message={error} onRetry={() => setReloadKey((n) => n + 1)} />;
  else if (!data) content = <Loading />;
  else if (!data.content.length) {
    content = (
      <Empty title="조건에 맞는 매물이 없습니다">
        {anyOn ? (
          <span className="empty-actions">
            <span>조건을 하나씩 빼서 다시 찾아보세요.</span>
            <span className="empty-buttons">
              {(applied.minPrice || applied.maxPrice) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeApplied(['minPrice', 'maxPrice'])}>가격 조건 빼고 보기</button>
              )}
              {applied.gu && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeApplied(['gu'])}>전체 지역에서 보기</button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>조건 모두 지우기</button>
            </span>
          </span>
        ) : '잠시 후 다시 시도해 보세요.'}
      </Empty>
    );
  } else {
    content = (
      <>
        <ul className="apt-list search-list">
          {data.content.map((apt) => <AptListItem key={apt.aptId} apt={apt} />)}
        </ul>
        {data.totalPages > 1 && (
          <nav className="pager" aria-label="페이지">
            <button type="button" disabled={data.page === 0} onClick={() => goPage(data.page - 1)} aria-label="이전 페이지"><Icon name="chevronLeft" /></button>
            {pageItems(data.page, data.totalPages).map((i) => (typeof i === 'string'
              ? <span key={i} className="pager-gap" aria-hidden="true">…</span>
              : <button key={i} type="button" className={i === data.page ? 'on' : ''} aria-current={i === data.page ? 'page' : undefined} aria-label={`${i + 1}페이지`} onClick={() => goPage(i)}>{i + 1}</button>
            ))}
            <button type="button" disabled={data.page >= data.totalPages - 1} onClick={() => goPage(data.page + 1)} aria-label="다음 페이지"><Icon name="chevronRight" /></button>
          </nav>
        )}
      </>
    );
  }

  return (
    <>
      <SearchFilterBar applied={applied} onApply={applyFilters} />
      <section className="search-results">
        <div className="search-head">
          <h2 className="list-title">{data ? <>검색 결과 <b>{data.totalElements.toLocaleString()}</b>건</> : '검색 결과'}</h2>
          <select className="select" value={sort} onChange={(e) => update({ ...applied, sort: e.target.value, page: 0 })} aria-label="정렬">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {content}
      </section>
    </>
  );
}

/** 매물찾기 — 조건 검색(GET /api/apartments/search) · 맞춤 추천(GET /api/recommend) */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'recommend' ? 'recommend' : 'search';
  useTitle(tab === 'recommend' ? '맞춤 추천 · 매물찾기' : '매물찾기');
  const pickTab = (k) => setParams(k === 'search' ? {} : { tab: k });
  // 탭 키보드 이동: ← → Home End (선택된 탭만 Tab 키로 들어감)
  const onTabKey = (e) => {
    const i = TABS.findIndex(([k]) => k === tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const k = TABS[(next + TABS.length) % TABS.length][0];
    pickTab(k);
    document.getElementById(`tab-${k}`)?.focus();
  };

  return (
    <div className="container section">
      <header className="page-head">
        <h1>매물찾기</h1>
        <p className="muted">성남, 용인, 수원의 아파트 매물을 조건으로 검색하거나, 예산에 맞춰 추천받으세요.</p>
      </header>
      <div className="page-tabs" role="tablist" aria-label="찾는 방법" onKeyDown={onTabKey}>
        {TABS.map(([k, label]) => (
          <button
            key={k}
            id={`tab-${k}`}
            type="button"
            role="tab"
            aria-selected={tab === k}
            aria-controls="search-panel"
            tabIndex={tab === k ? 0 : -1}
            className={`page-tab${tab === k ? ' on' : ''}`}
            onClick={() => pickTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="search-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'search' ? <ConditionSearch /> : <RecommendPage embedded />}
      </div>
    </div>
  );
}
