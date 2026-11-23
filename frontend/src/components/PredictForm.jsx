import { useState } from 'react';
import { REGIONS } from '../constants/regions';

const CURRENT_YEAR = new Date().getFullYear();

function validate({ gu, areaM2, floor, builtYear }) {
  if (!gu) return '지역(구)을 선택해 주세요.';
  if (!areaM2 || areaM2 <= 0 || areaM2 > 300) return '전용면적은 1 ~ 300㎡ 사이로 입력해 주세요.';
  if (floor === '' || floor < -5 || floor > 80) return '층은 -5 ~ 80 사이로 입력해 주세요.';
  if (!builtYear || builtYear < 1960 || builtYear > CURRENT_YEAR) return `준공연도는 1960 ~ ${CURRENT_YEAR} 사이로 입력해 주세요.`;
  return '';
}

/** 가격 예측 입력 폼 */
export default function PredictForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ gu: '', areaM2: '', floor: '', builtYear: '' });
  const [error, setError] = useState('');

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate(form);
    setError(msg);
    if (!msg) onSubmit(form);
  };

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2 className="card-title">아파트 정보 입력</h2>
      <label className="field">
        <span>지역 (구) *</span>
        <select name="gu" value={form.gu} onChange={change}>
          <option value="">선택</option>
          {REGIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <label className="field">
        <span>전용면적 (㎡) *</span>
        <input type="number" name="areaM2" min="1" step="0.01" placeholder="예: 84.97" value={form.areaM2} onChange={change} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>층 *</span>
          <input type="number" name="floor" step="1" placeholder="예: 12" value={form.floor} onChange={change} />
        </label>
        <label className="field">
          <span>준공연도 *</span>
          <input type="number" name="builtYear" step="1" placeholder="예: 2010" value={form.builtYear} onChange={change} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? '예측 중…' : 'AI 예상가 확인'}
      </button>
    </form>
  );
}
