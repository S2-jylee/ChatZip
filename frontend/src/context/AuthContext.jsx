import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // 첫 /api/auth/me 확인 중

  useEffect(() => {
    let cancelled = false;
    authApi.fetchMe()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); }) // 401 = 비로그인
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (loginId, password) => {
    const u = await authApi.login(loginId, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, logout, signup: authApi.signup }),
    [user, checking, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
