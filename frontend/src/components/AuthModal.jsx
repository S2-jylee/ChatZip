import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AuthForm from './AuthForm';
import { useAuth } from '../context/AuthContext';
import { errorMessage, statusOf } from '../api/client';
import './AuthModal.css';
import { lockScroll } from '../utils/scrollLock';

/** 카카오 말풍선 로고 (카카오 로그인 디자인 가이드: 노란 바탕 #FEE500 + 검은 로고) */
function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="#191919" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.76 5 4.4 6.33l-.9 3.3c-.08.3.26.54.52.37l3.94-2.6c.5.06 1.01.1 1.54.1 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5z" />
    </svg>
  );
}

/** 로그인 · 회원가입 모달 — 보던 화면 위에 띄우고, 닫으면 보던 화면이 그대로 */
export default function AuthModal() {
  const { authMode, setAuthMode, closeAuth, login, signup, kakaoLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => { setServerError(''); }, [authMode]);

  useEffect(() => {
    if (!authMode) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeAuth(); };
    document.addEventListener('keydown', onKey);
    const unlock = lockScroll();
    return () => { document.removeEventListener('keydown', onKey); unlock(); };
  }, [authMode, closeAuth]);

  if (!authMode) return null;
  const isSignup = authMode === 'signup';

  const run = async (fn, messages) => {
    setLoading(true);
    setServerError('');
    try {
      await fn();
    } catch (err) {
      setServerError(messages[statusOf(err)] ?? errorMessage(err, messages.default));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (form) => (isSignup
    ? run(() => signup(form), { 409: '이미 가입된 이메일입니다.', default: '회원가입에 실패했습니다.' })
    : run(() => login(form.loginId, form.password), { 401: '이메일 또는 비밀번호가 올바르지 않습니다.', default: '로그인에 실패했습니다.' }));
  const handleKakao = () => run(kakaoLogin, { default: '카카오 로그인에 실패했습니다.' });

  const kakaoBtn = (
    <button type="button" className="btn-kakao auth-btn" onClick={handleKakao} disabled={loading}>
      <span className="auth-btn-icon"><KakaoIcon /></span>
      {isSignup ? '카카오 계정으로 시작하기' : '카카오 계정으로 로그인'}
    </button>
  );

  return createPortal(
    <div className="auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeAuth(); }}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="auth-close" onClick={closeAuth} aria-label="닫기">×</button>
        <h2 id="auth-title" className="auth-title">{isSignup ? '회원가입' : '로그인'}</h2>

        {isSignup && (
          <>
            {kakaoBtn}
            <p className="auth-kakao-note">카카오 계정으로 바로 가입돼요. 따로 비밀번호를 만들 필요가 없어요.</p>
            <div className="auth-divider"><span>또는 이메일로 가입</span></div>
          </>
        )}

        <AuthForm key={authMode} mode={authMode} onSubmit={handleSubmit} serverError={serverError} loading={loading} />

        {!isSignup && (
          <>
            <div className="auth-divider"><span>다른 방법으로 로그인</span></div>
            {kakaoBtn}
          </>
        )}

        <p className="auth-switch">
          {isSignup ? '이미 계정이 있으신가요? ' : '아직 회원이 아니신가요? '}
          <button type="button" className="auth-switch-btn" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}>
            {isSignup ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
