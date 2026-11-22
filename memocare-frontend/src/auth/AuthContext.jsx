import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api';
import { refreshSession } from '../api/client';
import { tokenStore } from './tokenStore';

const AuthContext = createContext(null);

export const ROLES = {
  FAMILY: 'FAMILY',
  CARETAKER: 'CARETAKER',
  HOSPITAL_STAFF: 'HOSPITAL_STAFF',
  MEDICAL_STORE: 'MEDICAL_STORE',
  ADMIN: 'ADMIN',
};

/** Staff-or-above helper used all over the UI to gate clinical actions. */
export function isClinical(role) {
  return role === ROLES.HOSPITAL_STAFF || role === ROLES.ADMIN;
}
/** Can this role schedule/edit appointments (vs. read-only)? */
export function canScheduleAppointments(role) {
  return role === ROLES.CARETAKER || isClinical(role);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  const bootstrap = useCallback(async () => {
    if (!tokenStore.getRefreshToken()) {
      setStatus('anonymous');
      return;
    }
    try {
      await refreshSession();
      const me = await authService.me();
      setUser(me);
      setStatus('authenticated');
    } catch {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    bootstrap();
    const onExpired = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener('memocare:session-expired', onExpired);
    return () => window.removeEventListener('memocare:session-expired', onExpired);
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const { accessToken, refreshToken, user: loggedInUser } = await authService.login(email, password);
    tokenStore.setTokens({ accessToken, refreshToken });
    setUser(loggedInUser);
    setStatus('authenticated');
    return loggedInUser;
  }, []);

  const loginByManagementCode = useCallback(async (code) => {
    const { accessToken, refreshToken, user: loggedInUser } = await authService.loginByManagementCode(code);
    tokenStore.setTokens({ accessToken, refreshToken });
    setUser(loggedInUser);
    setStatus('authenticated');
    return loggedInUser;
  }, []);

  const signup = useCallback(async (body) => authService.signup(body), []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        /* already logged out locally; ignore network errors here */
      }
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      loginByManagementCode,
      signup,
      logout,
      refreshMe,
    }),
    [user, status, login, loginByManagementCode, signup, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
