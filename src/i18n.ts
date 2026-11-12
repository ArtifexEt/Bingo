import { useSyncExternalStore } from "react";

export type Language = "pl" | "en";
export type TranslationParams = Record<string, string | number>;
export const languageNames: Record<Language, string> = {
  pl: "Polski",
  en: "English",
};
export const languageStorageKey = "bingo-language";

// Eager imports are included in the app bundle and remain available in the offline PWA.
const files = import.meta.glob<Record<string, string>>("./locales/*.json", {
  eager: true,
  import: "default",
});
export const dictionaries: Record<Language, Record<string, string>> = {
  pl: {},
  en: {},
};
for (const [path, values] of Object.entries(files)) {
  const locale = path.match(/(?:\/|\.)(pl|en)\.json$/)?.[1] as
    | Language
    | undefined;
  if (locale) Object.assign(dictionaries[locale], values);
}

let language: Language | undefined;
const listeners = new Set<() => void>();
let listening = false;
const supported = (value: unknown): value is Language =>
  value === "pl" || value === "en";

export function detectLanguage(
  saved: string | null,
  preferred: readonly string[] = [],
): Language {
  if (supported(saved)) return saved;
  for (const value of preferred) {
    const candidate = value.toLowerCase().split("-")[0];
    if (supported(candidate)) return candidate;
  }
  return "pl";
}

function initialLanguage() {
  // Server rendering and unit tests have a deterministic default.
  if (typeof window === "undefined") return "pl" as const;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(languageStorageKey);
  } catch {
    // A blocked browser store must not prevent language selection.
  }
  return detectLanguage(
    saved,
    typeof navigator === "undefined" ? [] : navigator.languages,
  );
}

export function getLanguage(): Language {
  return (language ??= initialLanguage());
}

function updateDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = getLanguage();
  document.title = t("document.title");
  const description = document.querySelector('meta[name="description"]');
  description?.setAttribute("content", t("document.description"));
}

function updateLanguage(value: Language) {
  const changed = getLanguage() !== value;
  language = value;
  updateDocument();
  if (changed) for (const listener of listeners) listener();
}

export function initializeLanguage() {
  updateDocument();
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key === languageStorageKey || event.key === null)
        updateLanguage(initialLanguage());
    });
    listening = true;
  }
}

export function setLanguage(value: Language) {
  if (!supported(value)) return;
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(languageStorageKey, value);
  } catch {
    // The chosen language still works for the current session.
  }
  updateLanguage(value);
}

export function translateForLanguage(
  locale: Language,
  key: string,
  params: TranslationParams = {},
) {
  const value = dictionaries[locale][key] ?? dictionaries.pl[key] ?? key;
  return value.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : placeholder,
  );
}

export function t(key: string, params?: TranslationParams): string {
  return translateForLanguage(getLanguage(), key, params);
}

const messageKeys = new Map<string, string>();
const messageTemplates: { key: string; pattern: RegExp; names: string[] }[] =
  [];
for (const messages of Object.values(dictionaries)) {
  for (const [key, value] of Object.entries(messages)) {
    messageKeys.set(value, key);
    const names: string[] = [];
    const parts = value.split(/(\{\{\w+\}\})/g);
    if (parts.length === 1) continue;
    const pattern = parts
      .map((part) => {
        const name = part.match(/^\{\{(\w+)\}\}$/)?.[1];
        if (name) {
          names.push(name);
          return "([\\s\\S]*?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    messageTemplates.push({
      key,
      pattern: new RegExp("^" + pattern + "$"),
      names,
    });
  }
}

/** Re-render existing status/error strings in the chosen language without restarting playback.
 * Only use this for app messages: song titles, deck names and other user data stay unchanged.
 */
export function displayTranslation(message: string): string {
  const key = messageKeys.get(message);
  if (key) return t(key);
  for (const template of messageTemplates) {
    const match = message.match(template.pattern);
    if (match) {
      const params = Object.fromEntries(
        template.names.map((name, i) => [name, match[i + 1]]),
      );
      return t(template.key, params);
    }
  }
  return message;
}

/** Freeze a language for a single asynchronous job, such as a PDF export. */
export function createTranslator(locale = getLanguage()) {
  return (key: string, params?: TranslationParams) =>
    translateForLanguage(locale, key, params);
}

function subscribe(listener: () => void) {
  initializeLanguage();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTranslation() {
  const locale = useSyncExternalStore(
    subscribe,
    getLanguage,
    () => "pl" as const,
  );
  return { t, language: locale, setLanguage };
}

/** Keep existing keyed label APIs reactive without storing translated strings at import time. */
export function localizedRecord<K extends string>(
  keys: readonly K[],
  prefix: string,
): Record<K, string> {
  return Object.defineProperties(
    {},
    Object.fromEntries(
      keys.map((key) => [
        key,
        { enumerable: true, get: () => t(prefix + key) },
      ]),
    ),
  ) as Record<K, string>;
}
