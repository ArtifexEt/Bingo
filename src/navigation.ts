import type { BingoLevel } from "./bingo";
import type { BingoSheet } from "./BingoGame";
import type { Language } from "./i18n";

export const levelStorageKey = "bingo-level";
export type Route = {
  level: BingoLevel;
  sheet: BingoSheet;
  language?: Language;
};

export function parseRoute(
  href: string,
  savedLevel: string | null = null,
): Route {
  const params = new URL(href, "https://artifexet.github.io/Bingo/")
    .searchParams;
  const entryLevel = params.get("level");
  const level =
    entryLevel === "beginner" || entryLevel === "expert"
      ? entryLevel
      : savedLevel;
  const sheet = params.get("sheet");
  const language = params.get("lang");
  return {
    level: level === "expert" ? "expert" : "beginner",
    sheet: sheet === "print" || sheet === "help" ? sheet : null,
    language: language === "pl" || language === "en" ? language : undefined,
  };
}

export function routeHref(
  path: string,
  route: Route,
  language: Language,
): string {
  const params = new URLSearchParams({ level: route.level, lang: language });
  if (route.sheet) params.set("sheet", route.sheet);
  return `${path}?${params}`;
}

export function hiciarzUrl(
  view: "editor" | "scanner",
  language: Language,
): string {
  const url = new URL("https://artifexet.github.io/Hiciarz/");
  url.search = new URLSearchParams({ view, lang: language }).toString();
  return url.href;
}
