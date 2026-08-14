import { createContext, useContext, useState, useMemo } from 'react';
import { translations } from '../i18n/translations';

const LocaleContext = createContext();

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('en');

  const t = useMemo(() => {
    return (key) => {
      const dict = translations[locale] || translations.en;
      return dict[key] || translations.en[key] || key;
    };
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  return useContext(LocaleContext);
}
