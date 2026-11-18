import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { errorMessage, statusOf } from '../api/client';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (form) => {
    setLoading(true);
    setServerError('');
    try {
      await signup(form);
      navigate('/login', { replace: true, state: { signedUp: true } });
    } catch (err) {
      setServerError(statusOf(err) === 409
        ? '이미 사용 중인 아이디입니다.'
        : errorMessage(err, '회원가입에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>회원가입</h1>
        <AuthForm mode="signup" onSubmit={handleSubmit} serverError={serverError} loading={loading} />
        <p className="auth-switch">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
      </div>
    </div>
  );
}
