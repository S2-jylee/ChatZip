import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Empty, Loading } from './Status';

/** 로그인이 필요한 페이지 보호 — 비로그인이면 로그인 모달을 띄우고, 로그인되면 그 자리에서 바로 페이지를 보여줌 */
export default function ProtectedRoute({ children }) {
  const { user, checking, openAuth } = useAuth();
  useEffect(() => { if (!checking && !user) openAuth('login'); }, [checking, user, openAuth]);
  if (checking) return <Loading />;
  if (!user) {
    return (
      <div className="container section">
        <Empty title="로그인이 필요한 화면입니다">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('login')}>로그인</button>
        </Empty>
      </div>
    );
  }
  return children;
}
