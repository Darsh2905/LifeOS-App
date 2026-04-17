import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const MealContext = createContext();

export function MealProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/meals');
      setMeals(data);
    } catch (err) {
      console.error('Meals fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addMeal = useCallback(async (meal) => {
    try {
      const created = await api.post('/meals', meal);
      setMeals(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Add meal error:', err);
    }
  }, []);

  const updateMeal = useCallback(async (id, updates) => {
    try {
      const updated = await api.put(`/meals/${id}`, updates);
      setMeals(prev => prev.map(m => m.id === id ? updated : m));
    } catch (err) {
      console.error('Update meal error:', err);
    }
  }, []);

  const deleteMeal = useCallback(async (id) => {
    try {
      await api.delete(`/meals/${id}`);
      setMeals(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Delete meal error:', err);
    }
  }, []);

  return (
    <MealContext.Provider value={{ meals, addMeal, updateMeal, deleteMeal, loading }}>
      {children}
    </MealContext.Provider>
  );
}

export const useMeals = () => useContext(MealContext);
