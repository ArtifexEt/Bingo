import { useId } from "react";
import {
  Coffee,
  ExternalLink,
  Languages,
  Link2,
  Smartphone,
} from "lucide-react";
import { useTranslation, type Language } from "./i18n";
import { hiciarzUrl } from "./navigation";
import PwaControls from "./PwaControls";
import "./settings.css";

export default function AppSettings({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const { t } = useTranslation();
  const languageId = useId();
  const linksId = useId();
  const appId = useId();

  return (
    <div className="app-settings">
      <section className="settings-section" aria-labelledby={languageId}>
        <h3 id={languageId}>
          <Languages size={20} aria-hidden="true" />
          {t("shell.language")}
        </h3>
        <div
          className="language-switch"
          role="group"
          aria-label={t("shell.language")}
        >
          {(["pl", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              lang={value}
              aria-pressed={language === value}
              onClick={() => onLanguageChange(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section" aria-labelledby={linksId}>
        <h3 id={linksId}>
          <Link2 size={20} aria-hidden="true" />
          {t("settings.links")}
        </h3>
        <div className="settings-links">
          <a
            className="settings-link"
            href={hiciarzUrl("editor", language)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} aria-hidden="true" />
            {t("shell.createCards")}
          </a>
          <a
            className="settings-link"
            href="https://buymeacoffee.com/szymonrybka"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Coffee size={18} aria-hidden="true" />
            {t("shell.buyCoffee")}
          </a>
        </div>
      </section>
      <section className="settings-section" aria-labelledby={appId}>
        <h3 id={appId}>
          <Smartphone size={20} aria-hidden="true" />
          {t("settings.app")}
        </h3>
        <PwaControls />
      </section>
    </div>
  );
}
