'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Locale, TranslationStrings } from './types';
import { en } from './en';
import { fr } from './fr';

const translations: Record<Locale, TranslationStrings> = { en, fr };

/**
 * The locale used during SSR and initial hydration.
 * MUST be a static value that is identical on server and client
 * to prevent React hydration mismatches.
 */
const SSR_DEFAULT_LOCALE: Locale = 'en';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationStrings;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Detect the user's preferred locale from browser settings or localStorage.
 * Only called on the client after hydration.
 */
function detectClientLocale(): Locale {
  // 1. Check localStorage for a saved preference
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('qms-locale');
      if (saved === 'en' || saved === 'fr') return saved;
    } catch {
      // localStorage may be unavailable (incognito, etc.)
    }

    // 2. Check navigator.language
    const lang = navigator.language.split('-')[0];
    if (lang === 'en') return 'en';
    if (lang === 'fr') return 'fr';
  }

  // 3. Default fallback
  return 'fr';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start with the SSR default to avoid hydration mismatch
  const [locale, setLocaleState] = useState<Locale>(SSR_DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  // After hydration, detect the actual preferred locale
  useEffect(() => {
    const detected = detectClientLocale();
    if (detected !== SSR_DEFAULT_LOCALE) {
      setLocaleState(detected);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    // Persist the choice
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('qms-locale', newLocale);
      } catch {
        // Ignore storage errors
      }
    }
  };

  const t = useMemo(() => translations[locale], [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}
