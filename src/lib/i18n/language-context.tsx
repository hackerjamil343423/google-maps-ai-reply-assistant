"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  APP_LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n/types";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectBrowserLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  const fromNavigator =
    window.navigator.languages?.[0] || window.navigator.language || "en";
  return normalizeLanguage(fromNavigator);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    return stored ? normalizeLanguage(stored) : detectBrowserLanguage();
  });

  useEffect(() => {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      ready: true,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}
