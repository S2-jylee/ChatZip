import { useEffect, useState } from 'react';
import { SEOUL_GU } from '../constants/regions';
import {
  DEFAULT_TYPE, FILTER_KEYS, NEAR_STATION_MIN, areaPresetsOf, dealTabsOf, defaultDealOf, pricePresetsOf, priceStepOf, rentPresetsOf,
} from '../constants/propertyTypes';

const EMPTY = Object.fromEntries(FILTER_KEYS.map((k) => [k, '']));

// 가격 · 월세 · 면적 칩은 매물 종류(·거래 종류)별로 다름 → constants/propertyTypes.js

/** 지도 검색 필터 (지역·가격·월세·면적·역세권). value 는 URL 쿼리에서 온 값 (deal 포함) */
export default function FilterPanel({ value, onSubmit, type = DEFAULT_TYPE }) {
  const [form, setForm] = useState({ ...EMPTY, ...value });
  const [error, setError] = useState('');

  // 뒤로가기 등으로 URL이 바뀌면 폼도 맞춰줌
  useEffect(() => { setForm({ ...EMPTY, ...value }); }, [value]);

  const dealTabs = dealTabsOf(type); // 빌라·원룸만 거래 종류가 있음
  const deal = form.deal || defaultDealOf(type);
  const priceChips = pricePresetsOf(type, deal);
  const priceStep = priceStepOf(type, deal);
  const rentChips = rentPresetsOf(type);
  const areaChips = areaPresetsOf(type);
  const priceTitle = { sale: '매매가', jeonse: '전세 보증금', monthly: '보증금' }[deal];

  const submit = (next) => {
    if (next.minPrice && next.maxPrice && Number(next.minPrice) > Number(next.maxPrice)) {
      setError(`최소 ${priceTitle}이 최대보다 클 수 없습니다.`);
      return;
    }
    if (next.minRent && next.maxRent && Number(next.minRent) > Number(next.maxRent)) {
      setError('최소 월세가 최대 월세보다 클 수 없습니다.');
      return;
    }
    if (next.minArea && next.maxArea && Number(next.minArea) > Number(next.maxArea)) {
      setError('최소 면적이 최대 면적보다 클 수 없습니다.');
      return;
    }
    setError('');
    onSubmit(next);
  };

  const apply = (patch) => { const next = { ...form, ...patch }; setForm(next); submit(next); };
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  // 구 · 칩은 고르는 즉시 검색. 거래 종류 탭은 목록 영역 위(MapPage)에 있고, 여기선 value.deal 만 읽어 칩을 바꿈
  const isOn = (p, minKey, maxKey) => form[minKey] === p.min && form[maxKey] === p.max;
  const chipRow = (chips, minKey, maxKey) => (
    <div className="chips">
      {chips.map((p) => (
        <button
          key={p.label}
          type="button"
          className={`chip${isOn(p, minKey, maxKey) ? ' on' : ''}`}
          title={p.title}
          onClick={() => apply({ [minKey]: p.min, [maxKey]: p.max })}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <form className="filter" onSubmit={(e) => { e.preventDefault(); submit(form); }}>
      <div className="filter-group">
        <span className="filter-label">지역</span>
        <select name="gu" value={form.gu} onChange={(e) => apply({ gu: e.target.value })} className="select">
          <option value="">서울 전체</option>
          {SEOUL_GU.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <span className="filter-label">{dealTabs.length ? priceTitle : '가격'}</span>
        {chipRow(priceChips, 'minPrice', 'maxPrice')}
        <div className="range">
          <input type="number" name="minPrice" min="0" step={priceStep} placeholder="최소 (만원)" value={form.minPrice} onChange={change} />
          <span>~</span>
          <input type="number" name="maxPrice" min="0" step={priceStep} placeholder="최대 (만원)" value={form.maxPrice} onChange={change} />
        </div>
      </div>

      {deal === 'monthly' && dealTabs.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">월세</span>
          {chipRow(rentChips, 'minRent', 'maxRent')}
          <div className="range">
            <input type="number" name="minRent" min="0" step="5" placeholder="최소 (만원/월)" value={form.minRent} onChange={change} />
            <span>~</span>
            <input type="number" name="maxRent" min="0" step="5" placeholder="최대 (만원/월)" value={form.maxRent} onChange={change} />
          </div>
        </div>
      )}

      <div className="filter-group">
        <span className="filter-label">면적</span>
        {chipRow(areaChips, 'minArea', 'maxArea')}
        <div className="range">
          <input type="number" name="minArea" min="0" step="1" placeholder="최소 (㎡)" value={form.minArea} onChange={change} />
          <span>~</span>
          <input type="number" name="maxArea" min="0" step="1" placeholder="최대 (㎡)" value={form.maxArea} onChange={change} />
        </div>
      </div>

      {dealTabs.length > 0 && (
        <label className="filter-check" title="가까운 지하철역까지 직선거리로 계산한 도보 시간">
          <input
            type="checkbox"
            checked={form.maxWalk === String(NEAR_STATION_MIN)}
            onChange={(e) => apply({ maxWalk: e.target.checked ? String(NEAR_STATION_MIN) : '' })}
          />
          <span>역세권만 (지하철역 도보 {NEAR_STATION_MIN}분 이내)</span>
        </label>
      )}

      {error && <p className="form-error">{error}</p>}
      <div className="filter-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(EMPTY); submit(EMPTY); }}>초기화</button>
        <button type="submit" className="btn btn-primary btn-sm">직접 입력값으로 검색</button>
      </div>
    </form>
  );
}
