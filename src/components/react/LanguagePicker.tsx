import { useState, useRef, useEffect } from 'react';

const LOCALES: [string, string][] = [
  ['en', 'EN'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['zh', '中文'],
  ['de', 'DE'],
  ['fr', 'FR'],
  ['es', 'ES'],
  ['pt', 'PT'],
  ['it', 'IT'],
  ['pl', 'PL'],
  ['ru', 'RU'],
  ['tr', 'TR'],
  ['th', 'ไทย'],
];

export default function LanguagePicker({ locale = 'en' }: { locale?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const current = LOCALES.find(([code]) => code === locale) || LOCALES[0];

  function buildUrl(targetLocale: string) {
    const path = window.location.pathname;
    // Strip current locale prefix if present
    const stripped = locale !== 'en' ? path.replace(new RegExp('^/' + locale + '(/|$)'), '/') : path;
    // Add new locale prefix (skip for English)
    const newPath = targetLocale === 'en' ? stripped : '/' + targetLocale + stripped;
    return newPath + window.location.search;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap"
        aria-label="Change language"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {current[1]}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/10 bg-[#0a0d13]/95 backdrop-blur-xl shadow-xl overflow-hidden z-50">
          {LOCALES.map(([code, label]) => (
            <a
              key={code}
              href={buildUrl(code)}
              className={'block px-3 py-1.5 text-xs transition-colors ' +
                (code === locale
                  ? 'text-amber-300 bg-amber-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/10')}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
