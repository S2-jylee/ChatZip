import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * /login · /signup 주소로 바로 들어온 경우 (예전 링크 · 즐겨찾기)
 * 로그인·회원가입은 이제 모달이므로 메인으로 보내면서 모달을 띄움
 */
export default function LoginPage({ mode = 'login' }) {
  const { user, openAuth } = useAuth();
  useEffect(() => { if (!user) openAuth(mode); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Navigate to="/" replace />;
}
