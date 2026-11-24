import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AptListItem from '../components/AptListItem';
import ConfirmDialog from '../components/ConfirmDialog';
import CompareModal from '../components/CompareModal';
import '../components/CompareModal.css';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getFavorites, removeFavorite } from '../api/favorites';
import { errorMessage, statusOf } from '../api/client';
import { formatDate } from '../utils/format';
import { useAiKinds } from '../utils/useAiKinds';
import { useTitle } from '../utils/useTitle';

export default function FavoritesPage() {
  const { openAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needLogin, setNeedLogin] = useState(false); // 로그인이 풀려 401 → 빈 목록 대신 로그인 안내
  const [confirmDel, setConfirmDel] = useState(null); // { aptId, name } — 삭제 확인 창
  const [notice, setNotice] = useState(''); // 삭제 실패 등 안내 (alert 대신)
  const [deleting, setDeleting] = useState(null);
  const [checked, setChecked] = useState([]); // 비교할 매물 id (최대 3개, 고른 순서)
  const [comparing, setComparing] = useState(false);
  const MAX = 3;
  useTitle('관심매물');

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
    setNeedLogin(false);
    getFavorites()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 401) {
          setNeedLogin(true);
          openAuth('login', { onSuccess: () => load() });
        }
        else setError(errorMessage(err, '관심 매물을 불러오지 못했습니다.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [openAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => load(), [load]);

  // 매물마다 AI 적정가 · 저평가 · 고평가 배지
  const aiApts = useMemo(() => items.map((f) => f.apartment), [items]);
  const aiKinds = useAiKinds(aiApts);

  const closeConfirm = useCallback(() => setConfirmDel(null), []);
  const handleDelete = async () => {
    const { aptId } = confirmDel;
    setDeleting(aptId);
    setNotice('');
    try {
      await removeFavorite(aptId);
      setItems((prev) => prev.filter((f) => f.apartment.aptId !== aptId));
      setChecked((ids) => ids.filter((x) => x !== aptId));
    } catch (err) {
      setNotice(errorMessage(err, '삭제하지 못했습니다.'));
    } finally {
      setDeleting(null);
      setConfirmDel(null);
    }
  };

  let content;
  if (loading) content = <Loading />;
  else if (needLogin) {
    content = (
      <Empty title="로그인이 필요해요">
        로그인하면 저장한 관심 매물을 볼 수 있어요.{' '}
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('login', { onSuccess: () => load() })}>로그인</button>
      </Empty>
    );
  } else if (error) content = <ErrorBox message={error} onRetry={load} />;
  else if (!items.length) {
    content = (
      <Empty title="저장한 관심 매물이 없습니다">
        <Link to="/search">매물찾기에서 찾아보세요 →</Link>
      </Empty>
    );
  } else {
    content = (
      <>
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
                  onClick={() => setConfirmDel({ aptId: apartment.aptId, name: apartment.name })}
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
    <div className="container section">
      <header className="page-head">
        <h1>관심 매물 {!loading && !error && !needLogin && <small>{items.length}건</small>}</h1>
        <p className="muted">저장한 매물을 모아 보고, 2~{MAX}개를 체크해 실거래가 · 평당가 · 준공연도를 비교해 보세요.</p>
      </header>
      {notice && (
        <div className="status status-error" role="alert">
          <p>{notice}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice('')}>닫기</button>
        </div>
      )}
      {content}
      {confirmDel && (
        <ConfirmDialog
          title="관심 매물에서 삭제할까요?"
          message={`'${confirmDel.name}'을(를) 목록에서 뺍니다.`}
          confirmLabel="삭제"
          danger
          busy={deleting === confirmDel.aptId}
          onConfirm={handleDelete}
          onCancel={closeConfirm}
        />
      )}
      {comparing && compareList.length >= 2 && (
        <CompareModal apartments={compareList} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}
