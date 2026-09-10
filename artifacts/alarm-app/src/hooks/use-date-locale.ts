import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { it, enUS, fr, de, es, pt, zhCN, ko } from "date-fns/locale";
import type { Locale } from "date-fns";

const LOCALES: Record<string, Locale> = {
  it,
  en: enUS,
  fr,
  de,
  es,
  pt,
  zh: zhCN,
  ko,
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  return useMemo(() => LOCALES[i18n.language] ?? it, [i18n.language]);
}
