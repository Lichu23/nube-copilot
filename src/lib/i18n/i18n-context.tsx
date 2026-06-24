"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./messages";
import { getMessages } from "./messages";

type I18nContextValue = {
  locale: Locale;
  messages: ReturnType<typeof getMessages>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
}: Readonly<{
  children: React.ReactNode;
  locale: Locale;
}>) {
  return (
    <I18nContext.Provider value={{ locale, messages: getMessages(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return value;
}
