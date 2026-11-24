import { useEffect, useRef, useState } from 'react';
import { REGIONS } from '../constants/regions';
import { formatPrice } from '../utils/format';
import Icon from './Icon';

const CURRENT_YEAR = new Date().getFullYear();
const PYEONG = 3.3058;
const GU_ANY = '상관없음';

/**
 * 맞춤 추천 조건 입력 — 조건 검색 탭과 같은 위쪽 바 모양
 * [예산 입력 (필수)] [추천 받기]
 * [지역 ▾] [면적 ▾] [준공연도 ▾]  ← 누르면 아래 작은 창에서 고름 (고른 값은 [추천 받기] 때 함께 보냄)
 * 보내는 조건은 예전과 같음: maxPrice (필수) · gu · minArea · minBuiltYear
 */
export default function ConditionForm({ onSubmit, loading, initial }) {
  // initial: 마이페이지 선호 조건으로 미리 채움 (로그인 시)
  const [form, setForm] = useState({ gu: '', maxPrice: '', minArea: '', minBuiltYear: '', ...initial });
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // 'gu' | 'area' | 'year'
  const [draft, setDraft] = useState('');
  const ref = useRef(null);

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

  const toggle = (k) => {
    setError('');
    setDraft(k === 'area' ? form.minArea : k === 'year' ? form.minBuiltYear : '');
    setOpen((o) => (o === k ? null : k));
  };
  const pickValue = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setOpen(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.maxPrice || Number(form.maxPrice) <= 0) {
      setError('예산(최대 가격)을 입력해 주세요.');
      return;
    }
    if (form.minBuiltYear && (form.minBuiltYear < 1960 || form.minBuiltYear > CURRENT_YEAR)) {
      setError(`준공연도는 1960 ~ ${CURRENT_YEAR} 사이로 입력해 주세요.`);
      return;
    }
    setError('');
    setOpen(null);
    onSubmit(form);
  };
  const applyYear = () => {
    if (draft && (draft < 1960 || draft > CURRENT_YEAR)) {
      setError(`준공연도는 1960 ~ ${CURRENT_YEAR} 사이로 입력해 주세요.`);
      return;
    }
    setError('');
    pickValue('minBuiltYear', draft);
  };

  const items = [
    { k: 'gu', label: '지역', value: form.gu },
    { k: 'area', label: '최소 면적', value: form.minArea && `${form.minArea}㎡ 이상` },
    { k: 'year', label: '준공연도', value: form.minBuiltYear && `${form.minBuiltYear}년 이후` },
  ];
  const titles = { gu: '희망 지역', area: '최소 전용면적', year: '준공연도' };

  const panel = {
    gu: (
      <div className="chips">
        {['', ...REGIONS].map((g) => (
          <button key={g || GU_ANY} type="button" className={`chip${form.gu === g ? ' on' : ''}`} aria-pressed={form.gu === g} onClick={() => pickValue('gu', g)}>
            {g || GU_ANY}
          </button>
        ))}
      </div>
    ),
    area: (
      <>
        <div className="fpop-range">
          <input type="number" min="0" step="1" placeholder="예: 59 (㎡)" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="최소 전용면적 (㎡)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pickValue('minArea', draft); } }} />
          <span>㎡ 이상</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => pickValue('minArea', draft)}>적용</button>
        </div>
        <small className="field-hint" aria-live="polite">{draft ? `= 약 ${Math.round(Number(draft) / PYEONG)}평 이상` : '1평 ≈ 3.3㎡ · 전용 84㎡ ≈ 25평'}</small>
      </>
    ),
    year: (
      <>
        <div className="fpop-range">
          <input type="number" min="1960" max={CURRENT_YEAR} placeholder="예: 2005" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="준공연도 (이후)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyYear(); } }} />
          <span>년 이후</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyYear}>적용</button>
        </div>
        <small className="field-hint">이 해 이후에 지은 단지만 추천해요.</small>
      </>
    ),
  };

  return (
    <form className="sbar rec-bar" ref={ref} onSubmit={handleSubmit} noValidate>
      {/* [예산 입력] [추천 받기] — 조건 검색의 [검색어] [검색] 과 같은 배치 */}
      <div className="sbar-search">
        <label className="sbar-input">
          <span className="rec-budget-label">예산 <em className="req">필수</em></span>
          <input
            type="number"
            name="maxPrice"
            min="0"
            step="1000"
            inputMode="numeric"
            placeholder="최대 가격 · 예: 80000 (8억)"
            value={form.maxPrice}
            onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
            aria-label="예산 · 최대 가격 (만원)"
            aria-describedby="rec-budget-read"
            aria-invalid={!!error && !form.maxPrice}
          />
          {/* 단위 자리에서 입력값을 읽어줌 (별도 안내 줄 없이 → 조건 검색 탭과 같은 높이) */}
          <span id="rec-budget-read" className="rec-unit" aria-live="polite">
            만원{form.maxPrice && Number(form.maxPrice) > 0 && <b> = {formatPrice(form.maxPrice)}</b>}
          </span>
        </label>
        <button type="submit" className="btn btn-primary sbar-submit" disabled={loading}>
          {loading ? '추천 중…' : '추천 받기'}
        </button>
      </div>
      {error && !open && <p className="form-error" role="alert">{error}</p>}

      <div className="sbar-row" role="toolbar" aria-label="추가 조건">
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
            {open === it.k && (
              <div className="spop" role="dialog" aria-label={titles[it.k]}>
                <div className="fpop-head">
                  <strong>{titles[it.k]}</strong>
                  <button type="button" className="fpop-close" onClick={() => setOpen(null)} aria-label="닫기"><Icon name="x" size={18} /></button>
                </div>
                {panel[it.k]}
                {error && <p className="form-error" role="alert">{error}</p>}
              </div>
            )}
          </div>
        ))}
        {(form.gu || form.minArea || form.minBuiltYear) && (
          <button type="button" className="sbar-reset" onClick={() => setForm((f) => ({ ...f, gu: '', minArea: '', minBuiltYear: '' }))}>
            추가 조건 지우기
          </button>
        )}
      </div>
    </form>
  );
}
