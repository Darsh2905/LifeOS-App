import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { TASK_STATES } from '../utils/constants';
import { getTodayKey } from '../utils/helpers';

const TaskContext = createContext();

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function getNextDueDate(dueDate, recurring) {
  const baseDate = parseDateValue(dueDate);
  const start = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

  switch (recurring) {
    case 'daily':
      return formatDateKey(addDays(start, 1));
    case 'weekly':
      return formatDateKey(addDays(start, 7));
    case 'monthly':
      return formatDateKey(addMonths(start, 1));
    default:
      return dueDate;
  }
}

export function TaskProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from backend
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Tasks fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addTask = useCallback(async (task) => {
    try {
      const created = await api.post('/tasks', task);
      setTasks(prev => [created, ...prev]);
    } catch (err) {
      console.error('Add task error:', err);
    }
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    try {
      const updated = await api.put(`/tasks/${id}`, updates);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      console.error('Update task error:', err);
    }
  }, []);

  const completeTask = useCallback(async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.recurring && task.recurring !== 'none') {
      const updates = {
        status: TASK_STATES.TODO,
        dueDate: getNextDueDate(task.dueDate, task.recurring),
        lastCompletedAt: new Date().toISOString(),
      };
      try {
        const updated = await api.put(`/tasks/${id}`, updates);
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
      } catch (err) {
        console.error('Complete task error:', err);
      }
    } else {
      try {
        const updated = await api.put(`/tasks/${id}`, { status: TASK_STATES.DONE, lastCompletedAt: new Date().toISOString() });
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
      } catch (err) {
        console.error('Complete task error:', err);
      }
    }
  }, [tasks]);

  const deleteTask = useCallback(async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete task error:', err);
    }
  }, []);

  const clearAllTasks = useCallback(async () => {
    // Delete all tasks one by one (for safety)
    for (const task of tasks) {
      try { await api.delete(`/tasks/${task.id}`); } catch {}
    }
    setTasks([]);
  }, [tasks]);

  const todayTasks = tasks.filter(t => t.createdAt === getTodayKey());
  const completedToday = todayTasks.filter(t => t.status === TASK_STATES.DONE).length;
  const totalToday = todayTasks.length;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <TaskContext.Provider value={{
      tasks, addTask, updateTask, completeTask, deleteTask, clearAllTasks,
      todayTasks, completedToday, totalToday, completionRate, loading,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
