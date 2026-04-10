import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { generateId, getTodayKey } from '../utils/helpers';
import { TASK_STATES } from '../utils/constants';

const TaskContext = createContext();

function getInitialTasks() {
  const saved = storage.get('lifeos-tasks', null);
  if (saved && Array.isArray(saved)) return saved;
  return [];
}

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
  const [tasks, setTasks] = useState(getInitialTasks);

  useEffect(() => {
    storage.set('lifeos-tasks', tasks);
  }, [tasks]);

  const addTask = useCallback((task) => {
    setTasks(prev => [...prev, {
      id: generateId(),
      createdAt: getTodayKey(),
      status: TASK_STATES.TODO,
      category: 'Work',
      ...task,
    }]);
  }, []);

  const updateTask = useCallback((id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const completeTask = useCallback((id) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;

      if (task.recurring && task.recurring !== 'none') {
        return {
          ...task,
          status: TASK_STATES.TODO,
          dueDate: getNextDueDate(task.dueDate, task.recurring),
          lastCompletedAt: new Date().toISOString(),
        };
      }

      return { ...task, status: TASK_STATES.DONE, lastCompletedAt: new Date().toISOString() };
    }));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const todayTasks = tasks.filter(t => t.createdAt === getTodayKey());
  const completedToday = todayTasks.filter(t => t.status === TASK_STATES.DONE).length;
  const totalToday = todayTasks.length;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <TaskContext.Provider value={{
      tasks, addTask, updateTask, completeTask, deleteTask, clearAllTasks,
      todayTasks, completedToday, totalToday, completionRate,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
