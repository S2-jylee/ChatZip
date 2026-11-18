import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './Status';

/** 로그인이 필요한 페이지 보호 — 비로그인이면 /login 으로 보내고, 로그인 후 원래 페이지로 복귀 */
export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
