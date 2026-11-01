import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/ui/toastContext.js';
import { api, onSessionExpired, refreshSession, setAccessToken } from '../../lib/apiClient.js';
import { AuthContext } from './authContext.js';

const SIGNED_OUT = { status: 'anonymous', user: null };

/** Holds the signed-in user for the whole app and restores the session on page load. */
export function AuthProvider({ children }) {
  const showToast = useToast();
  const [session, setSession] = useState({ status: 'loading', user: null });

  // The refresh cookie survives page reloads, so try to resume the previous session.
  useEffect(() => {
    let isActive = true;
    refreshSession().then(
      ({ user }) => isActive && setSession({ status: 'authenticated', user }),
      () => isActive && setSession(SIGNED_OUT),
    );
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setSession(SIGNED_OUT);
        showToast({ variant: 'info', message: 'Your session has expired. Please sign in again.' });
      }),
    [showToast],
  );

  const startSession = useCallback(({ user, accessToken }) => {
    setAccessToken(accessToken);
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const login = useCallback(
    async (credentials) => startSession((await api.post('/auth/login', credentials)).data),
    [startSession],
  );

  const register = useCallback(
    async (details) => startSession((await api.post('/auth/register', details)).data),
    [startSession],
  );

  const logout = useCallback(async () => {
    // Sign out locally even if the server cannot be reached.
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setSession(SIGNED_OUT);
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      isAuthenticated: session.status === 'authenticated',
      isAdmin: session.user?.role === 'admin',
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
