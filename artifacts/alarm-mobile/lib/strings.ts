import it from '../i18n/locales/it.json';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import de from '../i18n/locales/de.json';
import es from '../i18n/locales/es.json';
import pt from '../i18n/locales/pt.json';
import zh from '../i18n/locales/zh.json';
import ko from '../i18n/locales/ko.json';
import { useLocalData } from '@/lib/local-data';

export const SUPPORTED_LANGUAGES = ['it', 'en', 'fr', 'de', 'es', 'pt', 'zh', 'ko'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const LOCALES: Record<SupportedLanguage, Record<string, unknown>> = {
  it, en, fr, de, es, pt, zh, ko,
};

export const NATIVE_LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  it: 'Italiano',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  zh: '中文',
  ko: '한국어',
};

function flattenEnglish(value: unknown, path: string[] = [], matches = new Map<string, string[]>()) {
  if (typeof value === 'string') {
    const paths = matches.get(value) ?? [];
    paths.push(path.join('.'));
    matches.set(value, paths);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => flattenEnglish(item, [...path, String(index)], matches));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => flattenEnglish(child, [...path, key], matches));
  }
  return matches;
}

const ENGLISH_KEYS = new Map(
  [...flattenEnglish(en)].filter(([, paths]) => paths.length === 1).map(([value, paths]) => [value, paths[0]]),
);

function normalizeLanguage(language: string): SupportedLanguage {
  const code = language.toLowerCase().split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(code) ? code : 'it';
}

function valueAtPath(language: string, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) return current[Number(part)];
    if (typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, LOCALES[normalizeLanguage(language)]);
}

function interpolate(value: string, variables?: Record<string, string | number>) {
  if (!variables) return value;
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (token, key: string) => {
    const replacement = variables[key.trim()];
    return replacement == null ? token : String(replacement);
  });
}

export function translate(
  language: string,
  key: string,
  variables?: Record<string, string | number>,
): unknown {
  const value = valueAtPath(language, key);
  if (typeof value === 'string') return interpolate(value, variables);
  if (Array.isArray(value)) return value;
  return undefined;
}

/**
 * Reuses the web app's translated copy for mobile labels when a matching
 * English source string exists. The supplied Italian text remains the
 * fallback for strings that are specific to the native notification flow.
 */
export function text(language: string, italian: string, english: string) {
  const code = normalizeLanguage(language);
  if (code === 'en') return english;
  const key = ENGLISH_KEYS.get(english);
  if (key) {
    const translated = translate(code, key);
    if (typeof translated === 'string') return translated;
  }
  return code === 'it' ? italian : italian;
}

export function languageOptionLabel(language: string, code: SupportedLanguage) {
  const translated = translate(language, `settings.languageNames.${code}`);
  const localized = typeof translated === 'string' ? translated : NATIVE_LANGUAGE_NAMES[code];
  return `${localized} (${NATIVE_LANGUAGE_NAMES[code]})`;
}

export function deviceLanguage(): SupportedLanguage {
  const deviceCode = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(deviceCode) ? deviceCode : 'it';
}

export function useAppLanguage(): SupportedLanguage {
  const { settings } = useLocalData();
  if (settings.languageCode && SUPPORTED_LANGUAGES.includes(settings.languageCode as SupportedLanguage)) {
    return settings.languageCode as SupportedLanguage;
  }
  return deviceLanguage();
}

export function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatDate(value: string | Date, language = 'it') {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(normalizeLanguage(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTimeLeft(date: Date, language: string) {
  const diffMins = Math.floor((date.getTime() - Date.now()) / 60_000);
  if (diffMins < 60) return translate(language, 'time.inMin', { n: Math.max(0, diffMins) }) as string;
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  if (hours < 24) {
    return minutes > 0
      ? translate(language, 'time.inHoursMin', { h: hours, m: minutes }) as string
      : translate(language, 'time.inHours', { n: hours }) as string;
  }
  return translate(language, 'time.inDays', { n: Math.floor(hours / 24) }) as string;
}
