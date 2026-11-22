import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

/**
 * 로그인 상태 + 로그인·회원가입 모달
 * openAuth('login' | 'signup', { onSuccess }) — 화면 이동 없이 모달을 띄우고, 로그인되면 onSuccess 로 하려던 일을 이어서 함
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // 첫 /api/auth/me 확인 중
  const [authMode, setAuthMode] = useState(null); // null(닫힘) | 'login' | 'signup'
  const afterLoginRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    authApi.fetchMe()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); }) // 401 = 비로그인
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const openAuth = useCallback((mode = 'login', { onSuccess } = {}) => {
    afterLoginRef.current = onSuccess ?? null;
    setAuthMode(mode);
  }, []);
  const closeAuth = useCallback(() => { afterLoginRef.current = null; setAuthMode(null); }, []);

  // 로그인 성공 공통 처리: 모달 닫고, 하려던 일 이어서
  const done = useCallback((u) => {
    setUser(u);
    setAuthMode(null);
    const after = afterLoginRef.current;
    afterLoginRef.current = null;
    if (after) setTimeout(() => after(u), 0);
    return u;
  }, []);

  const login = useCallback(async (loginId, password) => done(await authApi.login(loginId, password)), [done]);
  const kakaoLogin = useCallback(async () => done(await authApi.kakaoLogin()), [done]);
  // 가입하면 바로 로그인까지
  const signup = useCallback(async (form) => {
    await authApi.signup(form);
    return done(await authApi.login(form.loginId, form.password));
  }, [done]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, kakaoLogin, signup, logout, authMode, openAuth, closeAuth, setAuthMode }),
    [user, checking, login, kakaoLogin, signup, logout, authMode, openAuth, closeAuth],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
