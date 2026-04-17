import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const HabitsContext = createContext();

export function HabitsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/habits');
      setHabits(data);
    } catch (err) {
      console.error('Habits fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addHabit = useCallback(async (label, icon, color) => {
    try {
      const created = await api.post('/habits', { label, icon, color });
      setHabits(prev => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Add habit error:', err);
    }
  }, []);

  const toggleDay = useCallback(async (id, date) => {
    try {
      const updated = await api.put(`/habits/${id}/toggle`, { date });
      setHabits(prev => prev.map(h => h.id === id ? updated : h));
    } catch (err) {
      console.error('Toggle habit error:', err);
    }
  }, []);

  const deleteHabit = useCallback(async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Delete habit error:', err);
    }
  }, []);

  return (
    <HabitsContext.Provider value={{ habits, addHabit, toggleDay, deleteHabit, loading }}>
      {children}
    </HabitsContext.Provider>
  );
}

export const useHabits = () => useContext(HabitsContext);
