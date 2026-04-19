import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const JournalContext = createContext();

export function JournalProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/journal');
      setEntries(data);
    } catch (err) {
      console.error('Journal fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addEntry = useCallback(async (text, mood) => {
    try {
      const created = await api.post('/journal', { text, mood });
      setEntries(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Add entry error:', err);
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    try {
      await api.delete(`/journal/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Delete entry error:', err);
    }
  }, []);

  return (
    <JournalContext.Provider value={{ entries, addEntry, deleteEntry, refresh, loading }}>
      {children}
    </JournalContext.Provider>
  );
}

export const useJournal = () => useContext(JournalContext);
