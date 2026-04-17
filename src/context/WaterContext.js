import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const WaterContext = createContext();

export function WaterProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState({ logs: [], total: 0, goal: 2500, progress: 0, date: '' });
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDay = useCallback(async (date) => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const result = await api.get(`/water?date=${date}`);
      setData(result);
    } catch (err) {
      console.error('Water fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const addWater = useCallback(async (amount_ml, date) => {
    try {
      const result = await api.post('/water', { amount_ml, date });
      // Refresh the day's data
      await fetchDay(date || new Date().toISOString().split('T')[0]);
      return result;
    } catch (err) {
      console.error('Add water error:', err);
    }
  }, [fetchDay]);

  const deleteWater = useCallback(async (id, date) => {
    try {
      await api.delete(`/water/${id}`);
      await fetchDay(date || new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error('Delete water error:', err);
    }
  }, [fetchDay]);

  const fetchSummary = useCallback(async (days = 7) => {
    if (!isAuthenticated) return;
    try {
      const result = await api.get(`/water/summary?days=${days}`);
      setSummary(result);
    } catch (err) {
      console.error('Water summary error:', err);
    }
  }, [isAuthenticated]);

  return (
    <WaterContext.Provider value={{ data, summary, loading, fetchDay, addWater, deleteWater, fetchSummary }}>
      {children}
    </WaterContext.Provider>
  );
}

export const useWater = () => useContext(WaterContext);
