import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AptListItem from '../components/AptListItem';
import CompareModal from '../components/CompareModal';
import '../components/CompareModal.css';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getFavorites, removeFavorite } from '../api/favorites';
import { errorMessage, statusOf } from '../api/client';
import { predictPrice } from '../api/predict';
import { formatDate, verdictOf } from '../utils/format';

// AI 예상가는 매매가 기준 → 전세·월세 매물은 판정하지 않음
const isSale = (apt) => !apt.dealType || apt.dealType === 'sale';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [checked, setChecked] = useState([]); // 비교할 매물 id (최대 3개, 고른 순서)
  const [comparing, setComparing] = useState(false);
  const MAX = 3;

  const toggleCheck = (id) => setChecked((ids) => {
    if (ids.includes(id)) return ids.filter((x) => x !== id);
    return ids.length >= MAX ? ids : [...ids, id];
  });
  const compareList = useMemo(
    () => checked.map((id) => items.find((f) => f.apartment.aptId === id)?.apartment).filter(Boolean),
    [checked, items],
  );

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getFavorites()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 401) navigate('/login', { replace: true, state: { from: '/favorites' } });
        else setError(errorMessage(err, '관심 매물을 불러오지 못했습니다.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => load(), [load]);

  // 매물마다 AI 예상가를 받아 적정가 · 저평가 · 고평가 배지 (실패한 매물은 배지 없음)
  const [aiKinds, setAiKinds] = useState({});
  useEffect(() => {
    let cancelled = false;
    items.forEach(({ apartment: a }) => {
      if (!isSale(a) || aiKinds[a.aptId]) return;
      predictPrice(a)
        .then((predicted) => {
          const kind = verdictOf(a.price, predicted)?.kind;
          if (!cancelled && kind) setAiKinds((m) => ({ ...m, [a.aptId]: kind }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (aptId, name) => {
    if (!window.confirm(`'${name}'을(를) 관심 매물에서 삭제할까요?`)) return;
    setDeleting(aptId);
    try {
      await removeFavorite(aptId);
      setItems((prev) => prev.filter((f) => f.apartment.aptId !== aptId));
      setChecked((ids) => ids.filter((x) => x !== aptId));
    } catch (err) {
      window.alert(errorMessage(err, '삭제하지 못했습니다.'));
    } finally {
      setDeleting(null);
    }
  };

  let content;
  if (loading) content = <Loading />;
  else if (error) content = <ErrorBox message={error} onRetry={load} />;
  else if (!items.length) {
    content = (
      <Empty title="저장한 관심 매물이 없습니다">
        <Link to="/apartment">지도에서 매물을 찾아보세요 →</Link>
      </Empty>
    );
  } else {
    content = (
      <>
      <div className="fav-toolbar">
        <span>비교할 매물을 체크하세요 (2~{MAX}개)</span>
        {checked.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked([])}>선택 해제</button>}
      </div>
      <ul className="apt-list">
        {items.map(({ favoriteId, createdAt, apartment }) => {
          const on = checked.includes(apartment.aptId);
          const full = !on && checked.length >= MAX;
          return (
          <AptListItem
            key={favoriteId}
            apt={apartment}
            variant="card"
            aiKind={aiKinds[apartment.aptId]}
            active={on}
            leading={(
              <input
                type="checkbox"
                className="cmp-check"
                checked={on}
                disabled={full}
                onChange={() => toggleCheck(apartment.aptId)}
                aria-label={`${apartment.name} 비교에 추가`}
                title={full ? `최대 ${MAX}개까지 비교할 수 있어요` : '비교에 추가'}
              />
            )}
            actions={(
              <>
                <span className="muted small">저장 {formatDate(createdAt)}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={deleting === apartment.aptId}
                  onClick={() => handleDelete(apartment.aptId, apartment.name)}
                >
                  삭제
                </button>
              </>
            )}
          />
          );
        })}
      </ul>
      {checked.length > 0 && (
        <div className="compare-bar" role="region" aria-label="비교 선택">
          <div className="compare-bar-info">
            <b>{checked.length}</b> / {MAX}개 선택
            <small>{checked.length < 2 ? '1개 더 고르면 비교할 수 있어요' : compareList.map((a) => a.name).join(' · ')}</small>
          </div>
          <div className="compare-bar-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked([])}>해제</button>
            <button type="button" className="btn btn-accent btn-sm" disabled={checked.length < 2} onClick={() => setComparing(true)}>
              비교하기
            </button>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="container section narrow">
      <header className="page-head">
        <span className="eyebrow">모으기</span>
        <h1>관심 매물 {!loading && !error && <small>{items.length}건</small>}</h1>
      </header>
      {content}
      {comparing && compareList.length >= 2 && (
        <CompareModal apartments={compareList} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}
