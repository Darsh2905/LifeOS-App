import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

const ThemeContext = createContext();

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;
  const parsed = parseInt(value, 16);

  if (Number.isNaN(parsed)) return { r: 147, g: 51, b: 234 };

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => storage.get('lifeos-dark-mode', true));
  const [accentColor, setAccentColor] = useState(() => storage.get('lifeos-accent', '#9333ea'));

  useEffect(() => {
    storage.set('lifeos-dark-mode', isDark);
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [isDark]);

  useEffect(() => {
    const { r, g, b } = hexToRgb(accentColor);

    storage.set('lifeos-accent', accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--accent-light', `color-mix(in srgb, ${accentColor} 72%, white)`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
  }, [accentColor]);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
