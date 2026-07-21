import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../data/storageKeys';
import { AnalyticsLens, PrimaryAnalyticsLens } from '../domain/finance';

interface PreferencesContextType {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  analyticsLens: PrimaryAnalyticsLens;
  setAnalyticsLens: (lens: PrimaryAnalyticsLens) => void;
  reportsAnalyticsLens: AnalyticsLens;
  setReportsAnalyticsLens: (lens: AnalyticsLens) => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>(STORAGE_KEYS.darkMode, false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [analyticsLens, setAnalyticsLens] = useState<PrimaryAnalyticsLens>('actual');
  const [reportsAnalyticsLens, setReportsAnalyticsLens] = useState<AnalyticsLens>('actual');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <PreferencesContext.Provider value={{
      isDarkMode,
      setIsDarkMode,
      selectedMonth,
      setSelectedMonth,
      analyticsLens,
      setAnalyticsLens,
      reportsAnalyticsLens,
      setReportsAnalyticsLens,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
