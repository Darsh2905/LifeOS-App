import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/workouts');
      setWorkouts(data);
    } catch (err) {
      console.error('Workouts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addWorkout = useCallback(async (workout) => {
    try {
      const created = await api.post('/workouts', workout);
      setWorkouts(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Add workout error:', err);
    }
  }, []);

  const updateWorkout = useCallback(async (id, updates) => {
    try {
      const updated = await api.put(`/workouts/${id}`, updates);
      setWorkouts(prev => prev.map(w => w.id === id ? updated : w));
    } catch (err) {
      console.error('Update workout error:', err);
    }
  }, []);

  const deleteWorkout = useCallback(async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Delete workout error:', err);
    }
  }, []);

  return (
    <WorkoutContext.Provider value={{ workouts, addWorkout, updateWorkout, deleteWorkout, loading }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkouts = () => useContext(WorkoutContext);
