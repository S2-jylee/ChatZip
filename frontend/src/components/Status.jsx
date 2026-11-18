// 로딩 · 결과 없음 · 오류 표시 (기획서 12.1 프론트 QA)

export function Loading({ text = '불러오는 중…' }) {
  return (
    <div className="status" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function Empty({ title = '결과가 없습니다', children }) {
  return (
    <div className="status status-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="status status-error" role="alert">
      <strong>문제가 발생했습니다</strong>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}
