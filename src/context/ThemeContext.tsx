import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light';
  compactMode: boolean;
  hasStoredThemePreference: boolean;
  hasStoredCompactPreference: boolean;
  setTheme: (theme: ThemeMode) => void;
  setCompactMode: (compact: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compactMode, setCompactModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('campusfix_compact') === 'true';
    } catch {
      return false;
    }
  });
  const [hasStoredCompactPreference, setHasStoredCompactPreference] = useState(() => {
    try {
      return localStorage.getItem('campusfix_compact') !== null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }, []);

  const setTheme = useCallback(() => {}, []);

  const setCompactMode = useCallback((compact: boolean) => {
    setCompactModeState(compact);
    setHasStoredCompactPreference(true);
    try {
      localStorage.setItem('campusfix_compact', String(compact));
    } catch {
      // Continue using in-memory state when browser storage is unavailable.
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        resolvedTheme: 'light',
        compactMode,
        hasStoredThemePreference: false,
        hasStoredCompactPreference,
        setTheme,
        setCompactMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
