import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from token on mount. Also absorb tokens arriving from the
  // Google OAuth callback (?token=...) and surface a calendar-status event.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const calendarStatus = params.get('calendar');
    const calendarReason = params.get('reason');

    if (urlToken) {
      setToken(urlToken);
    }
    if (calendarStatus || urlToken) {
      // Strip sensitive params from the URL before anything else runs
      const cleaned = new URL(window.location.href);
      ['token', 'calendar', 'reason', 'new'].forEach(k => cleaned.searchParams.delete(k));
      window.history.replaceState({}, '', cleaned.pathname + (cleaned.search ? cleaned.search : '') + cleaned.hash);
    }
    if (calendarStatus) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('calendar:changed', {
          detail: { status: calendarStatus, reason: calendarReason },
        }));
        window.dispatchEvent(new CustomEvent('toast', {
          detail: calendarStatus === 'connected'
            ? { kind: 'success', title: 'Google Calendar connected', message: 'Your events will sync automatically.' }
            : { kind: 'error', title: 'Google sign-in failed', message: calendarReason || 'Please try again.' },
        }));
      }, 0);
    }

    const token = localStorage.getItem('lifeos-token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for token expiry events
  useEffect(() => {
    const handler = () => { setUser(null); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const signup = useCallback(async (name, email, password) => {
    try {
      const data = await api.post('/auth/signup', { name, email, password });
      // If email verification is required, don't set token/user
      if (data.requiresVerification) {
        return { success: false, requiresVerification: true, email: data.email, message: data.message };
      }
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
