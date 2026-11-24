import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll } from '../utils/scrollLock';
import './detail/ListingModal.css';

/** 확인 창 (window.confirm 대신) — Esc · 바깥 클릭 = 취소, 열리면 '취소'에 포커스, 닫히면 원래 버튼으로 포커스 복귀 */
export default function ConfirmDialog({ title, message, confirmLabel = '확인', danger = false, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    const unlock = lockScroll();
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlock();
      prev?.focus?.({ preventScroll: true });
    };
  }, [onCancel]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        {message && <p id="confirm-msg" className="muted">{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" ref={cancelRef} onClick={onCancel}>취소</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
            {busy ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
