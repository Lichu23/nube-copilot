"use client";

import { I18nProvider } from "@/lib/i18n/i18n-context";
import type { Locale } from "@/lib/i18n/messages";

export function AppProvider({
  children,
  locale,
}: Readonly<{
  children: React.ReactNode;
  locale: Locale;
}>) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
