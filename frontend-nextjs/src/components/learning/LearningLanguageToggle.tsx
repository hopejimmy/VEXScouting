'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LearningLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="border-b border-slate-200/80 bg-white/90">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-2 sm:px-6 lg:px-8">
        <Languages className="h-4 w-4 text-slate-500" />
        <span className="mr-1 text-xs font-semibold text-slate-500">
          {language === 'zh' ? '课程语言' : 'Lesson language'}
        </span>
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5" role="group" aria-label="Lesson language">
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            aria-pressed={language === 'zh'}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${language === 'zh' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${language === 'en' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
}
