import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";

export const SUPPORTED_LANGUAGES = ["it", "en", "fr", "de", "es", "pt", "zh", "ko"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/** Native name of each language — always shown in parentheses */
export const NATIVE_NAMES: Record<SupportedLanguage, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  zh: "中文",
  ko: "한국어",
};

function getInitialLanguage(): string {
  const stored = localStorage.getItem("alarm_app_language");
  if (stored && stored !== "auto" && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored;
  }
  const browserLang = navigator.language.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage) ? browserLang : "it";
}

i18next.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "it",
  resources: {
    it: { translation: it },
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
    pt: { translation: pt },
    zh: { translation: zh },
    ko: { translation: ko },
  },
  interpolation: { escapeValue: false },
});

export default i18next;
