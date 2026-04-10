import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { storage } from '../utils/storage';

const AuthContext = createContext();

function getStoredUsers() {
  return storage.get('lifeos-users', []);
}

function getStoredSession() {
  return storage.get('lifeos-session', null);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate brief loading for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const signup = useCallback((name, email, password) => {
    const users = getStoredUsers();
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // In production, hash this
      avatar: name.trim().charAt(0).toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    storage.set('lifeos-users', users);

    const session = { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar, createdAt: newUser.createdAt };
    storage.set('lifeos-session', session);
    setUser(session);

    return { success: true };
  }, []);

  const login = useCallback((email, password) => {
    const users = getStoredUsers();
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    );

    if (!found) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const session = { id: found.id, name: found.name, email: found.email, avatar: found.avatar, createdAt: found.createdAt };
    storage.set('lifeos-session', session);
    setUser(session);

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    storage.remove('lifeos-session');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
