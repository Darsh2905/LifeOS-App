import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from token on mount
  useEffect(() => {
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
