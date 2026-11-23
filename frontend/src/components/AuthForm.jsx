import { useState } from 'react';

/** 로그인/회원가입 공통 폼. mode = 'login' | 'signup' */
export default function AuthForm({ mode, onSubmit, serverError, loading }) {
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ loginId: '', password: '', passwordConfirm: '', name: '' });
  const [error, setError] = useState('');

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.loginId.trim()) return '이메일을 입력해 주세요.';
    if (!form.password) return '비밀번호를 입력해 주세요.';
    if (!isSignup) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.loginId.trim())) return '이메일 형식으로 입력해 주세요.';
    if (form.password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (form.password !== form.passwordConfirm) return '비밀번호 확인이 일치하지 않습니다.';
    if (!form.name.trim()) return '닉네임을 입력해 주세요.';
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    setError(msg);
    if (msg) return;
    const payload = { loginId: form.loginId.trim(), password: form.password };
    if (isSignup) payload.name = form.name.trim();
    onSubmit(payload);
  };

  const shownError = error || serverError;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>이메일</span>
        <input type="email" name="loginId" autoComplete="email" placeholder="example@email.com" value={form.loginId} onChange={change} />
      </label>
      <label className="field">
        <span>비밀번호{isSignup && ' (8자 이상)'}</span>
        <input type="password" name="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={form.password} onChange={change} />
      </label>
      {isSignup && (
        <>
          <label className="field">
            <span>비밀번호 확인</span>
            <input type="password" name="passwordConfirm" autoComplete="new-password" value={form.passwordConfirm} onChange={change} />
          </label>
          <label className="field">
            <span>닉네임</span>
            <input name="name" autoComplete="nickname" value={form.name} onChange={change} />
          </label>
        </>
      )}
      {shownError && <p className="form-error" role="alert">{shownError}</p>}
      <button type="submit" className="btn btn-primary btn-block btn-lg auth-btn" disabled={loading}>
        <svg className="auth-btn-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" />
        </svg>
        {loading ? '처리 중…' : isSignup ? '회원가입' : '로그인'}
      </button>
    </form>
  );
}
