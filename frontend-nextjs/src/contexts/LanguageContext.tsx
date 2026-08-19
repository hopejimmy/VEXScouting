'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'zh' | 'en';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const languageStorageKey = 'vex-scouting-language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  useEffect(() => {
    const stored = localStorage.getItem(languageStorageKey);
    if (stored === 'zh' || stored === 'en') setLanguage(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(current => current === 'zh' ? 'en' : 'zh'),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
