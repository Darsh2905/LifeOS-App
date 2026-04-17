import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../utils/storage';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { getTodayKey } from '../utils/helpers';

const TimerContext = createContext();

const DEFAULT_FOCUS = 60 * 60;
const DEFAULT_BREAK = 5 * 60;

export function TimerProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [focusDuration, setFocusDuration] = useState(() => storage.get('lifeos-focus-duration', DEFAULT_FOCUS));
  const [breakDuration, setBreakDuration] = useState(() => storage.get('lifeos-break-duration', DEFAULT_BREAK));
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState({});
  const intervalRef = useRef(null);

  // Fetch sessions from backend
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/timer/sessions').then(setSessions).catch(() => {});
  }, [isAuthenticated]);

  const todaySessions = sessions[getTodayKey()] || 0;

  useEffect(() => {
    storage.set('lifeos-focus-duration', focusDuration);
  }, [focusDuration]);

  useEffect(() => {
    storage.set('lifeos-break-duration', breakDuration);
  }, [breakDuration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      if (!isBreak) {
        // Record session to backend
        api.post('/timer/sessions', { date: getTodayKey(), focusDuration })
          .then(setSessions)
          .catch(() => {
            // Fallback to local update
            setSessions(prev => ({ ...prev, [getTodayKey()]: (prev[getTodayKey()] || 0) + 1 }));
          });
        setIsBreak(true);
        setTimeLeft(breakDuration);
        setIsRunning(false);
      } else {
        setIsBreak(false);
        setTimeLeft(focusDuration);
        setIsRunning(false);
      }
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, isBreak, focusDuration, breakDuration]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(focusDuration);
  }, [focusDuration]);

  const setCustomFocus = useCallback((minutes) => {
    const parsedMinutes = Number(minutes);
    if (!Number.isFinite(parsedMinutes)) return;
    const secs = Math.max(60, Math.round(parsedMinutes * 60));
    setFocusDuration(secs);
    if (!isRunning && !isBreak) setTimeLeft(secs);
  }, [isRunning, isBreak]);

  const setCustomBreak = useCallback((minutes) => {
    const parsedMinutes = Number(minutes);
    if (!Number.isFinite(parsedMinutes)) return;
    const secs = Math.max(60, Math.round(parsedMinutes * 60));
    setBreakDuration(secs);
  }, []);

  return (
    <TimerContext.Provider value={{
      timeLeft, isRunning, isBreak, todaySessions, sessions,
      focusDuration, breakDuration,
      start, pause, reset, setCustomFocus, setCustomBreak,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
