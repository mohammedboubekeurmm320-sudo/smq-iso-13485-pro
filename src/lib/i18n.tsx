'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Minimal i18n provider — passthrough for now.
// Translations can be added later. The `t` function returns the key as-is
// so all existing `t('some.key')` calls continue to work (they display the
// English key which doubles as a readable label in most cases).
// ---------------------------------------------------------------------------

type Locale = 'en' | 'fr' | 'es' | 'de';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Simple translate — returns key as-is (no-op) */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>('en');

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let result = key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return result;
    },
    [],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

/** Hook for components that need `t()` (translation function) */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return { t: ctx.t, locale: ctx.locale };
}

/** Alias used by some components */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return { t: ctx.t, locale: ctx.locale, setLocale: ctx.setLocale };
}