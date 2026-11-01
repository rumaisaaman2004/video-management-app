import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * The signed-in user and auth actions:
 * `{ status, user, isAuthenticated, isAdmin, login, register, logout }`.
 * `status` is "loading" until the saved session has been checked.
 */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
