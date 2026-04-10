import { createContext, useContext, useState, useCallback } from 'react';

const FocusContext = createContext();

export function FocusProvider({ children }) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusTask, setFocusTask] = useState(null);

  const enterFocus = useCallback((task = null) => {
    setFocusTask(task);
    setIsFocusMode(true);
  }, []);

  const exitFocus = useCallback(() => {
    setIsFocusMode(false);
    setFocusTask(null);
  }, []);

  return (
    <FocusContext.Provider value={{ isFocusMode, focusTask, enterFocus, exitFocus }}>
      {children}
    </FocusContext.Provider>
  );
}

export const useFocus = () => useContext(FocusContext);
