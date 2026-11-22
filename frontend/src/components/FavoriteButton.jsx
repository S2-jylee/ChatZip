import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addFavorite, getFavorites, removeFavorite } from '../api/favorites';
import { errorMessage, statusOf } from '../api/client';

/** 관심 매물 저장/해제 토글. 비로그인이면 로그인 페이지로 보냄. compact = 지도 미리보기용 작은 버튼 */
export default function FavoriteButton({ aptId, compact = false, icon = false }) {
  const { user, openAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) { setSaved(false); return undefined; }
    let cancelled = false;
    getFavorites()
      .then((list) => { if (!cancelled) setSaved(list.some((f) => f.apartment.aptId === aptId)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, aptId]);

  // 비로그인 → 로그인 모달, 로그인되면 바로 저장까지 이어서
  const goLogin = () => openAuth('login', {
    onSuccess: () => addFavorite(aptId).then(() => setSaved(true)).catch((err) => { if (statusOf(err) === 409) setSaved(true); }),
  });

  const toggle = async () => {
    if (!user) { goLogin(); return; }
    setBusy(true);
    setMessage('');
    try {
      if (saved) {
        await removeFavorite(aptId);
        setSaved(false);
      } else {
        await addFavorite(aptId);
        setSaved(true);
      }
    } catch (err) {
      if (statusOf(err) === 409) setSaved(true); // 이미 저장됨 → 상태만 맞춤
      else if (statusOf(err) === 401) goLogin();
      else setMessage(errorMessage(err, '관심 매물 처리에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  // 하트 아이콘만 (지도 말풍선용 찜 버튼)
  if (icon) {
    return (
      <button
        type="button"
        className={`heart-btn${saved ? ' on' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? '찜 해제' : '찜하기'}
        title={saved ? '찜 해제' : '찜하기 (관심 매물)'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
        </svg>
      </button>
    );
  }

  const button = (
    <button
      type="button"
      className={`btn ${compact ? 'btn-sm btn-fav-compact ' : 'btn-lg '}${saved ? 'btn-saved' : compact ? 'btn-ghost' : 'btn-accent'}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      title={saved ? '관심 매물에서 빼기' : '관심 매물에 저장'}
    >
      {saved ? '♥' : '♡'} {compact ? (saved ? '저장됨' : '저장') : (saved ? '관심 매물 저장됨' : '관심 매물 저장')}
    </button>
  );

  if (compact) return button;
  return (
    <div className="fav">
      {button}
      {!user && <p className="muted small">로그인 후 저장할 수 있어요.</p>}
      {message && <p className="form-error">{message}</p>}
    </div>
  );
}
