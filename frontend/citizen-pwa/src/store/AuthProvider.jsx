import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@dgp/shared';
import { authService } from '@/features/auth/authService';

const AuthContext = createContext(undefined);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  // Ready = we've finished the initial "is the persisted token still valid?" check.
  const [ready, setReady] = useState(false);

  const persistSession = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // Validate a persisted token on boot; drop the session if the server rejects it.
  useEffect(() => {
    let active = true;
    async function verify() {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const fresh = await authService.getProfile();
        if (active) {
          setUser(fresh);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fresh));
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setReady(true);
      }
    }
    verify();
    return () => {
      active = false;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A 401 anywhere (expired JWT) clears the session app-wide.
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const { user: u, token: t } = await authService.login(credentials);
      persistSession(u, t);
      return u;
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload) => {
      const { user: u, token: t } = await authService.register(payload);
      persistSession(u, t);
      return u;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (payload) => {
    const updated = await authService.updateProfile(payload);
    setUser(updated);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateProfile,
      // Store an already-authenticated session (shared login page authenticates first,
      // then decides whether this app keeps the session or hands it to the admin portal).
      adoptSession: persistSession,
      // Drop whatever this app is holding, without calling the logout endpoint. The shared
      // login page uses it when an authenticated account turns out to belong to the other
      // portal: nothing of theirs should be left behind in this one.
      discardSession: clearSession,
    }),
    [user, token, ready, login, register, logout, updateProfile, persistSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
