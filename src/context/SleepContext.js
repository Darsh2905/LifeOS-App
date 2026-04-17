import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const SleepContext = createContext();

export function SleepProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/sleep');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Sleep fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveLog = useCallback(async ({ date, bedtime, wakeTime, quality, notes }) => {
    try {
      const saved = await api.post('/sleep', { date, bedtime, wakeTime, quality, notes });
      setLogs(prev => {
        const filtered = prev.filter(l => l.date !== date);
        return [saved, ...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
      return saved;
    } catch (err) {
      console.error('Save sleep error:', err);
    }
  }, []);

  const deleteLog = useCallback(async (id) => {
    try {
      await api.delete(`/sleep/${id}`);
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Delete sleep error:', err);
    }
  }, []);

  return (
    <SleepContext.Provider value={{ logs, saveLog, deleteLog, loading, refresh }}>
      {children}
    </SleepContext.Provider>
  );
}

export const useSleep = () => useContext(SleepContext);
