import { useEffect, useState } from "react";
import { Coffee, ExternalLink } from "lucide-react";
import BingoGame from "./BingoGame";
import PwaControls from "./PwaControls";
import {
  getLanguage,
  setLanguage,
  useTranslation,
  type Language,
} from "./i18n";
import {
  hiciarzUrl,
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
  const { language, t } = useTranslation();
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
          scannerUrl={hiciarzUrl("scanner", language)}
          sheet={route.sheet}
          onSheetChange={(sheet) => navigate({ ...route, sheet })}
          level={route.level}
          onLevelChange={(level) => navigate({ ...route, level })}
        />
      </main>
      <footer className="app-footer">
        <div className="app-toolbar">
          <div className="footer-links">
            <a
              className="creator-link"
              href={hiciarzUrl("editor", language)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("shell.createCards")}{" "}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <a
              className="support-link"
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee size={17} aria-hidden="true" />
              {t("shell.buyCoffee")}
            </a>
          </div>
          <div
            className="language-switch"
            role="group"
            aria-label={t("shell.language")}
          >
            {(["pl", "en"] as const).map((value: Language) => (
              <button
                key={value}
                type="button"
                lang={value}
                aria-pressed={language === value}
                onClick={() => navigate(route, value)}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <PwaControls />
      </footer>
    </div>
  );
}
