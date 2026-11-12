import { useEffect, useState } from "react";
import BingoGame from "./BingoGame";
import { getLanguage, setLanguage, useTranslation } from "./i18n";
import {
  levelStorageKey,
  parseRoute,
  routeHref,
  type Route,
} from "./navigation";

function savedLevel() {
  try {
    return localStorage.getItem(levelStorageKey);
  } catch {
    return null;
  }
}

export default function App() {
  const { language } = useTranslation();
  const [route, setRoute] = useState(() =>
    parseRoute(location.href, savedLevel()),
  );

  function navigate(next: Route, nextLanguage = language, replace = false) {
    if (nextLanguage !== getLanguage()) setLanguage(nextLanguage);
    const href = routeHref(location.pathname, next, nextLanguage);
    if (href !== location.pathname + location.search + location.hash)
      history[replace ? "replaceState" : "pushState"](null, "", href);
    setRoute(next);
  }

  useEffect(() => {
    const initial = parseRoute(location.href, savedLevel());
    navigate(initial, initial.language ?? getLanguage(), true);
    const onPop = () => {
      const next = parseRoute(location.href, savedLevel());
      if (next.language) setLanguage(next.language);
      setRoute(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(levelStorageKey, route.level);
    } catch {
      // The selected level remains usable when browser storage is blocked.
    }
  }, [route.level]);

  useEffect(() => {
    const href = routeHref(location.pathname, route, language);
    if (href !== location.pathname + location.search + location.hash)
      history.replaceState(null, "", href);
  }, [language, route]);

  return (
    <div className="bingo-app">
      <main>
        <BingoGame
          sheet={route.sheet}
          onSheetChange={(sheet) => navigate({ ...route, sheet })}
          level={route.level}
          onLevelChange={(level) => navigate({ ...route, level })}
          language={language}
          onLanguageChange={(next) => navigate(route, next)}
        />
      </main>
    </div>
  );
}
