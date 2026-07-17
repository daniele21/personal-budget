import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../data/storageKeys';

interface PreferencesContextType {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>(STORAGE_KEYS.darkMode, false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <PreferencesContext.Provider value={{ isDarkMode, setIsDarkMode, selectedMonth, setSelectedMonth }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
