import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'dz_shop_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'ar') return saved;
      // Default to French for Algerian e-commerce context
      return 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  function setLanguage(newLang) {
    if (newLang === 'fr' || newLang === 'ar') {
      setLangState(newLang);
    }
  }

  // Translation helper function supporting dot-notation paths and variable interpolation
  function t(path, vars = {}) {
    const keys = path.split('.');
    let value = translations[lang];
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback to French if missing in current language
        let fallback = translations.fr;
        for (const fKey of keys) {
          if (fallback && typeof fallback === 'object' && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            return path;
          }
        }
        value = fallback;
        break;
      }
    }

    if (typeof value === 'string') {
      let result = value;
      Object.keys(vars).forEach((varKey) => {
        result = result.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(vars[varKey]));
      });
      return result;
    }

    return value;
  }

  const currentTranslations = translations[lang] || translations.fr;

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLanguage,
        t,
        dict: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
