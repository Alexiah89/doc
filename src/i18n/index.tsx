import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Locale } from '../data/models';
import { useRepositories } from '../app/providers/RepositoryProvider';
import { de, type TranslationKey } from './de-DE';
import { en } from './en-US';
export function translate(
  locale: Locale,
  key: TranslationKey,
  values: Record<string, string | number> = {},
) {
  const text = locale === 'en-US' ? (en[key] ?? de[key]) : de[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    String(values[name] ?? match),
  );
}
const Context = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
} | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useRepositories();
  const [locale, setLocale] = useState<Locale>(
    () => settings.getSettings().locale,
  );
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        t: (key, values) => translate(locale, key, values),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error('I18nProvider missing');
  return value;
}
export type { TranslationKey };
