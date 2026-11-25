import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEstate, getEstate, updateEstate } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorBox, Loading } from '../../components/Status';
import { useTitle } from '../../utils/useTitle';
import { CITIES, districtsOf } from './adminShared';

const EMPTY = { estName: '', estAddress: '', city: '', district: '', dong: '', builtYear: '' };
const THIS_YEAR = new Date().getFullYear();

// 다음(카카오) 우편번호 서비스 — 키 없이 무료. 불러오지 못하면 주소를 직접 입력
const POSTCODE_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
let postcodePromise = null;
function loadPostcode() {
  if (window.daum?.Postcode) return Promise.resolve(window.daum.Postcode);
  if (!postcodePromise) {
    postcodePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = POSTCODE_SRC;
      s.async = true;
      s.onload = () => (window.daum?.Postcode ? resolve(window.daum.Postcode) : reject(new Error('postcode')));
      s.onerror = () => { postcodePromise = null; reject(new Error('postcode')); };
      document.head.appendChild(s);
    });
  }
  return postcodePromise;
}

function validate(f) {
  const errors = {};
  if (!f.estName.trim()) errors.estName = '단지명을 입력해 주세요.';
  if (!f.estAddress.trim()) errors.estAddress = '주소를 입력해 주세요.';
  if (!f.city) errors.city = '시를 선택해 주세요.';
  if (!f.district) errors.district = '구를 선택해 주세요.';
  if (f.builtYear && !(/^\d{4}$/.test(f.builtYear) && Number(f.builtYear) >= 1950 && Number(f.builtYear) <= THIS_YEAR + 5)) {
    errors.builtYear = `1950 ~ ${THIS_YEAR + 5} 사이 연도를 입력해 주세요.`;
  }
  return errors;
}

/** 단지 등록 (/admin/estates/new) · 수정 (/admin/estates/:id/edit) */
export default function AdminEstateForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [title, setTitle] = useState(isEdit ? '' : '새 단지 등록');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addrHint, setAddrHint] = useState('');
  const nameRef = useRef(null);
  useTitle(isEdit ? '단지 수정' : '단지 등록');

  useEffect(() => {
    if (!isEdit) { nameRef.current?.focus(); return undefined; }
    let cancelled = false;
    getEstate(id)
      .then((e) => {
        if (cancelled) return;
        setForm({
          estName: e.estName ?? '', estAddress: e.estAddress ?? '', city: e.city ?? '', district: e.district ?? '',
          dong: e.dong ?? '', builtYear: e.builtYear ? String(e.builtYear) : '',
        });
        setTitle(e.estName);
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, '단지 정보를 불러오지 못했습니다.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key) => (ev) => {
    const value = ev.target.value;
    setForm((f) => ({ ...f, [key]: value, ...(key === 'city' ? { district: '' } : {}) }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const searchAddress = async () => {
    setAddrHint('');
    try {
      const Postcode = await loadPostcode();
      new Postcode({
        oncomplete: (d) => {
          const [city = '', district = ''] = String(d.sigungu ?? '').split(' ');
          setForm((f) => ({
            ...f,
            estAddress: d.roadAddress || d.jibunAddress || d.address,
            city: CITIES.includes(city) ? city : f.city,
            district: districtsOf(city).includes(district) ? district : (CITIES.includes(city) ? '' : f.district),
            dong: d.bname || f.dong,
          }));
          setErrors((e) => ({ ...e, estAddress: undefined, city: undefined, district: undefined }));
          if (!CITIES.includes(city)) setAddrHint('서비스 지역(성남·용인·수원) 밖의 주소입니다. 시·구를 직접 골라 주세요.');
        },
      }).open();
    } catch {
      setAddrHint('주소 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요.');
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setSubmitError('');
    const first = Object.keys(errs)[0];
    if (first) { document.getElementById(`est-${first}`)?.focus(); return; }
    setSaving(true);
    try {
      if (isEdit) await updateEstate(id, form);
      else await createEstate(form);
      navigate('/admin/estates');
    } catch (err) {
      setSubmitError(errorMessage(err, '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><Loading /></div>;
  if (loadError) return <div className="admin-page"><ErrorBox message={loadError} /></div>;

  const fieldProps = (key) => ({
    id: `est-${key}`,
    value: form[key],
    onChange: set(key),
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `est-${key}-err` : undefined,
  });
  const err = (key) => errors[key] && <small id={`est-${key}-err`} className="admin-field-err">{errors[key]}</small>;

  return (
    <div className="admin-page admin-page-narrow">
      <form className="admin-card admin-form" onSubmit={submit} noValidate>
        <h1>{title}</h1>

        <div className="admin-field">
          <label htmlFor="est-estName">단지명</label>
          <input ref={nameRef} className="admin-input" placeholder="예) 분당 파크뷰" autoComplete="off" {...fieldProps('estName')} />
          {err('estName')}
        </div>

        <div className="admin-field">
          <label htmlFor="est-estAddress">주소</label>
          <div className="admin-addr">
            <input className="admin-input" placeholder="도로명 주소" autoComplete="off" {...fieldProps('estAddress')} />
            <button type="button" className="btn admin-btn-outline" onClick={searchAddress}>주소 검색</button>
          </div>
          {err('estAddress')}
          {addrHint && <small className="admin-field-hint">{addrHint}</small>}
        </div>

        <div className="admin-grid2">
          <div className="admin-field">
            <label htmlFor="est-city">시</label>
            <select className="select" {...fieldProps('city')}>
              <option value="">선택</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {err('city')}
          </div>
          <div className="admin-field">
            <label htmlFor="est-district">구</label>
            <select className="select" disabled={!form.city} {...fieldProps('district')}>
              <option value="">선택</option>
              {districtsOf(form.city).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {err('district')}
          </div>
          <div className="admin-field">
            <label htmlFor="est-dong">동</label>
            <input className="admin-input" placeholder="예) 정자동" autoComplete="off" {...fieldProps('dong')} />
          </div>
          <div className="admin-field">
            <label htmlFor="est-builtYear">준공연도</label>
            <input className="admin-input" placeholder="YYYY" inputMode="numeric" maxLength={4} autoComplete="off" {...fieldProps('builtYear')} />
            {err('builtYear')}
          </div>
        </div>

        <p className="admin-note">좌표 · 주소 저장 시 자동 변환</p>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}

        <div className="admin-form-actions">
          <button type="button" className="btn admin-btn-plain" onClick={() => navigate(-1)}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : (isEdit ? '저장' : '등록')}</button>
        </div>
      </form>
    </div>
  );
}
