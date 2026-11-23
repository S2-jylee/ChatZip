import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AptListItem from '../components/AptListItem';
import { Loading } from '../components/Status';
import { useAuth } from '../context/AuthContext';
import { getFavorites, removeFavorite } from '../api/favorites';
import { getApartment } from '../api/apartments';
import { getMyListings, getPreferences, savePreferences } from '../api/users';
import { errorMessage } from '../api/client';
import { SEOUL_GU } from '../constants/regions';
import { typeInfo } from '../constants/propertyTypes';
import {
  dealLabel, formatDate, formatPrice, formatPriceCompact, perPyeong, shortPrice, tierOf,
} from '../utils/format';
import { useDetailHref } from '../utils/detailLink';
import { photoOf } from '../utils/photo';
import { useAiKinds } from '../utils/useAiKinds';
import { recentViewed } from '../utils/viewed';
import './MyPage.css';

const STATUS = {
  PUBLISHED: { label: '게시중', cls: 'ok' },
  PENDING: { label: '승인대기', cls: 'wait' },
  REJECTED: { label: '반려', cls: 'no' },
  SUSPENDED: { label: '게시중지', cls: 'off' },
};
const WALKS = ['', '5', '10', '15'];
const soon = () => window.alert('준비 중인 기능입니다.');

const range = (min, max, fmt) => {
  if (min && max) return `${fmt(min)}~${fmt(max)}`;
  if (min) return `${fmt(min)} 이상`;
  if (max) return `${fmt(max)} 이하`;
  return '상관없음';
};

/** 선호 조건 — 보기 / 고치기 */
function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [form, setForm] = useState(null); // 고치는 중이면 폼 값
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getPreferences().then(setPrefs).catch(() => setPrefs({})); }, []);
  if (!prefs) return <Loading />;

  const rows = [
    ['매물 종류', '아파트 매매'],
    ['지역', prefs.gus?.length ? prefs.gus.map((g) => g.replace(/구$/, '')).join('·') : '서울 전체'],
    ['예산', range(prefs.minPrice, prefs.maxPrice, shortPrice)],
    ['면적', range(prefs.minArea, prefs.maxArea, (v) => `${v}㎡`)],
    ['역세권', prefs.maxWalk ? `도보 ${prefs.maxWalk}분` : '상관없음'],
  ];

  const edit = () => setForm({
    ...prefs,
    gus: prefs.gus ?? [],
    ...Object.fromEntries(['minPrice', 'maxPrice', 'minArea', 'maxArea', 'maxWalk'].map((k) => [k, prefs[k] ? String(prefs[k]) : ''])),
  });
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const toggleGu = (g) => setForm((f) => ({
    ...f, gus: f.gus.includes(g) ? f.gus.filter((x) => x !== g) : f.gus.length >= 3 ? f.gus : [...f.gus, g],
  }));
  const num = (v) => (v === '' ? null : Number(v));

  const save = async (e) => {
    e.preventDefault();
    const next = {
      type: 'apt', deal: 'sale', gus: form.gus,
      minPrice: num(form.minPrice), maxPrice: num(form.maxPrice), minArea: num(form.minArea), maxArea: num(form.maxArea), maxWalk: num(form.maxWalk),
    };
    if (next.minPrice && next.maxPrice && next.minPrice > next.maxPrice) { setError('최소 예산이 최대보다 클 수 없습니다.'); return; }
    if (next.minArea && next.maxArea && next.minArea > next.maxArea) { setError('최소 면적이 최대보다 클 수 없습니다.'); return; }
    setSaving(true);
    setError('');
    try {
      setPrefs(await savePreferences(next));
      setForm(null);
    } catch (err) {
      setError(errorMessage(err, '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (form) {
    return (
      <form className="pref-form" onSubmit={save}>
        <div className="field"><span>지역 (최대 3개)</span>
          <div className="chips">
            {SEOUL_GU.map((g) => (
              <button key={g} type="button" className={`chip${form.gus.includes(g) ? ' on' : ''}`} onClick={() => toggleGu(g)}>{g}</button>
            ))}
          </div>
        </div>
        <div className="field"><span>예산 (만원)</span>
          <div className="range">
            <input type="number" name="minPrice" min="0" step="1000" placeholder="최소" value={form.minPrice} onChange={change} />
            <span>~</span>
            <input type="number" name="maxPrice" min="0" step="1000" placeholder="최대" value={form.maxPrice} onChange={change} />
          </div>
        </div>
        <div className="field"><span>면적 (㎡)</span>
          <div className="range">
            <input type="number" name="minArea" min="0" placeholder="최소" value={form.minArea} onChange={change} />
            <span>~</span>
            <input type="number" name="maxArea" min="0" placeholder="최대" value={form.maxArea} onChange={change} />
          </div>
        </div>
        <label className="field"><span>역세권</span>
          <select name="maxWalk" value={form.maxWalk} onChange={change}>
            {WALKS.map((w) => <option key={w} value={w}>{w ? `도보 ${w}분 이내` : '상관없음'}</option>)}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="pref-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(null); setError(''); }}>취소</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <dl className="pref-list">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <button type="button" className="btn btn-primary btn-block" onClick={edit}>조건 수정</button>
    </>
  );
}

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const detailHref = useDetailHref();
  const [favorites, setFavorites] = useState(null);
  const [listings, setListings] = useState(null);
  const [recent, setRecent] = useState(null);
  const viewedList = useMemo(() => recentViewed(), []);

  useEffect(() => {
    getFavorites().then(setFavorites).catch(() => setFavorites([]));
    getMyListings().then(setListings).catch(() => setListings([]));
    // 최근 본 매물 3건 (이 기기 기록)
    Promise.all(viewedList.slice(0, 3).map(({ id, at }) => getApartment(id).then((a) => ({ ...a, viewedAt: at })).catch(() => null)))
      .then((list) => setRecent(list.filter(Boolean)));
  }, [viewedList]);

  const favApts = useMemo(() => (favorites ?? []).slice(0, 3).map((f) => f.apartment), [favorites]);
  const aiKinds = useAiKinds(favApts);

  const count = (s) => (listings ?? []).filter((l) => l.status === s).length;
  const stats = [
    ['관심 매물', favorites?.length],
    ['내 등록매물', listings?.length],
    ['승인 대기', listings && count('PENDING')],
    ['게시 중', listings && count('PUBLISHED')],
  ];

  const handleLogout = async () => { await logout(); navigate('/'); };
  const handleDelete = async (aptId, name) => {
    if (!window.confirm(`'${name}'을(를) 관심 매물에서 삭제할까요?`)) return;
    try {
      await removeFavorite(aptId);
      setFavorites((prev) => prev.filter((f) => f.apartment.aptId !== aptId));
    } catch (err) {
      window.alert(errorMessage(err, '삭제하지 못했습니다.'));
    }
  };

  const joined = user.createdAt ? `${String(user.createdAt).slice(0, 7).replace('-', '.')} 가입` : '';

  return (
    <div className="container section mypage">
      <header className="page-head">
        <h1>마이페이지</h1>
      </header>

      <div className="my-grid">
        {/* ---------- 왼쪽: 프로필 · 선호 조건 · 메뉴 ---------- */}
        <aside className="my-side card">
          <div className="my-profile">
            <span className="my-avatar" aria-hidden="true">{user.name?.[0] ?? '?'}</span>
            <strong className="my-name">{user.name} 님</strong>
            <span className="muted small">{[user.email, joined].filter(Boolean).join(' · ')}</span>
            {user.provider === 'kakao' && <span className="my-kakao">카카오 계정</span>}
            <button type="button" className="btn btn-ghost btn-block" onClick={soon}>프로필 편집</button>
          </div>

          <div className="my-block">
            <div className="my-block-head">
              <span>선호 조건</span>
              <span className="my-badge">맞춤추천에 사용</span>
            </div>
            <Preferences />
          </div>

          <nav className="my-menu" aria-label="마이페이지 메뉴">
            <a href="#my-listings">내 등록매물 <span aria-hidden="true">›</span></a>
            <button type="button" onClick={soon}>중개사 등록 신청 <span aria-hidden="true">›</span></button>
            <button type="button" onClick={soon}>회원정보 · 비밀번호 <span aria-hidden="true">›</span></button>
            <button type="button" className="my-logout" onClick={handleLogout}>로그아웃</button>
          </nav>
        </aside>

        {/* ---------- 오른쪽 ---------- */}
        <div className="my-main">
          <div className="my-stats">
            {stats.map(([label, n]) => (
              <div key={label} className="my-stat card">
                <span>{label}</span>
                <strong>{n ?? '—'}<small>건</small></strong>
              </div>
            ))}
          </div>

          <section id="my-listings" className="my-panel card">
            <div className="my-panel-head">
              <h2>내 등록매물 <small>{listings ? `${listings.length}건` : ''}</small></h2>
              <div className="my-panel-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={soon}>전체 보기 →</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={soon}>+ 매물 등록</button>
              </div>
            </div>
            {!listings ? <Loading /> : !listings.length ? <p className="muted my-empty">등록한 매물이 없습니다.</p> : (
              <ul className="my-listings">
                {listings.map((l, i) => {
                  const st = STATUS[l.status] ?? STATUS.PENDING;
                  return (
                    <li key={l.listingId} className="my-listing">
                      <img src={photoOf(l, i + 2)} alt="" className="my-listing-img" loading="lazy" />
                      <div className="my-listing-info">
                        <strong>{l.name}</strong>
                        <span className="muted small">{l.address}</span>
                        <div className="my-tags">
                          <span>{typeInfo(l.type).label}</span>
                          <span>전용 {l.areaM2}㎡</span>
                          <span>{l.floor}층</span>
                        </div>
                      </div>
                      <span className="my-listing-price">
                        <small className="deal-tag">{dealLabel(l.dealType)}</small>
                        {formatPriceCompact(l.price)}
                      </span>
                      <span className={`my-status ${st.cls}`}>{st.label}</span>
                      <button type="button" className="my-more" aria-label="더보기" onClick={soon}>⋯</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="my-panel card">
            <div className="my-panel-head">
              <h2>관심 매물 <small>{favorites ? `${favorites.length}건` : ''}</small></h2>
              <Link to="/favorites" className="btn btn-ghost btn-sm">전체 보기 →</Link>
            </div>
            {!favorites ? <Loading /> : !favorites.length ? (
              <p className="muted my-empty">저장한 관심 매물이 없습니다. <Link to="/search">매물찾기 →</Link></p>
            ) : (
              <ul className="apt-list">
                {favorites.slice(0, 3).map(({ favoriteId, createdAt, apartment }) => (
                  <AptListItem
                    key={favoriteId}
                    apt={apartment}
                    variant="card"
                    aiKind={aiKinds[apartment.aptId]}
                    actions={(
                      <>
                        <span className="muted small">저장 {formatDate(createdAt)}</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(apartment.aptId, apartment.name)}>삭제</button>
                      </>
                    )}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="my-recent">
            <div className="my-panel-head plain">
              <h2>최근 본 매물</h2>
              <span className="muted small">이 기기에서 본 매물 {viewedList.length}건</span>
            </div>
            {!recent ? <Loading /> : !recent.length ? <p className="muted my-empty">아직 본 매물이 없습니다.</p> : (
              <div className="card-grid">
                {recent.map((apt) => (
                  <Link key={apt.aptId} to={detailHref(apt.aptId)} className="apt-card">
                    <div className="apt-card-top">
                      <span className={`tier-tag tier-${tierOf(apt.price)}`}>{apt.gu}</span>
                      {apt.viewedAt > 0 && <span className="muted small">{formatDate(new Date(apt.viewedAt).toISOString().slice(0, 10))}</span>}
                    </div>
                    <strong className="apt-card-name">{apt.name}</strong>
                    <span className="muted small">{Math.round(apt.areaM2)}㎡ · {apt.floor}층 · {apt.builtYear}년</span>
                    <div className="apt-card-bottom">
                      <span className="apt-price">{formatPriceCompact(apt.price)}</span>
                      <span className="muted small">평당 {formatPrice(perPyeong(apt.price, apt.areaM2))}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
