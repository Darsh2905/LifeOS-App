import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const PlannerContext = createContext();

export function PlannerProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [weekPlans, setWeekPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlan = useCallback(async (date) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await api.get(`/planner?date=${date}`);
      setCurrentPlan(data);
    } catch (err) {
      console.error('Planner fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchWeek = useCallback(async (start, end) => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get(`/planner/range?start=${start}&end=${end}`);
      setWeekPlans(data);
    } catch (err) {
      console.error('Planner week fetch error:', err);
    }
  }, [isAuthenticated]);

  const savePlan = useCallback(async (planData) => {
    try {
      const result = await api.put('/planner', planData);
      setCurrentPlan(result);
      return result;
    } catch (err) {
      console.error('Save plan error:', err);
    }
  }, []);

  return (
    <PlannerContext.Provider value={{ currentPlan, weekPlans, loading, fetchPlan, fetchWeek, savePlan }}>
      {children}
    </PlannerContext.Provider>
  );
}

export const usePlanner = () => useContext(PlannerContext);
