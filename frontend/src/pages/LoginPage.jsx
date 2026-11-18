import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { errorMessage, statusOf } from '../api/client';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const from = location.state?.from || '/';

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async ({ loginId, password }) => {
    setLoading(true);
    setServerError('');
    try {
      await login(loginId, password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(statusOf(err) === 401
        ? '아이디 또는 비밀번호가 올바르지 않습니다.'
        : errorMessage(err, '로그인에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>로그인</h1>
        {location.state?.signedUp && <p className="form-success">회원가입이 완료되었습니다. 로그인해 주세요.</p>}
        <AuthForm mode="login" onSubmit={handleSubmit} serverError={serverError} loading={loading} />
        <p className="auth-switch">아직 회원이 아니신가요? <Link to="/signup">회원가입</Link></p>
      </div>
    </div>
  );
}
