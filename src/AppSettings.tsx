import { useId } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  ExternalLink,
  Grid3X3,
  Languages,
  ListFilter,
  Printer,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { bingoLevels, type BingoLevel, type BingoSize } from "./bingo";
import { useTranslation, type Language } from "./i18n";
import { hiciarzUrl } from "./navigation";
import PwaControls from "./PwaControls";
import "./settings.css";

function ChoiceRow({
  icon: Icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-row settings-row-choice">
      <Icon className="settings-row-icon" size={20} aria-hidden="true" />
      <span className="settings-row-copy">
        <span className="settings-row-title">{title}</span>
        <span className="settings-row-description" aria-hidden="true">
          {options.find((option) => option.value === value)?.label}
        </span>
      </span>
      <ChevronDown
        className="settings-row-chevron"
        size={17}
        aria-hidden="true"
      />
      <select
        aria-label={title}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  value,
  onClick,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="settings-row-icon" size={20} aria-hidden="true" />
      <span className="settings-row-copy">
        <span className="settings-row-title">{title}</span>
        {description && (
          <span className="settings-row-description">{description}</span>
        )}
      </span>
      <span className="settings-row-trailing">
        {value && <span className="settings-row-value">{value}</span>}
        {href ? (
          <ExternalLink
            className="settings-row-chevron"
            size={16}
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="settings-row-chevron"
            size={17}
            aria-hidden="true"
          />
        )}
      </span>
    </>
  );
  return href ? (
    <a
      className="settings-row settings-row-action"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <button
      className="settings-row settings-row-action"
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
    >
      {content}
    </button>
  );
}

export default function AppSettings({
  level,
  onLevelChange,
  size,
  onNewGame,
  roundDurationMs,
  onEditTime,
  sound,
  onSoundChange,
  soundSaved,
  language,
  onLanguageChange,
  onOpenHelp,
  onOpenPrint,
}: {
  level: BingoLevel;
  onLevelChange: (level: BingoLevel) => void;
  size: BingoSize;
  onNewGame: () => void;
  roundDurationMs: number;
  onEditTime: () => void;
  sound: boolean;
  onSoundChange: () => void;
  soundSaved: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onOpenHelp: () => void;
  onOpenPrint: () => void;
}) {
  const { t } = useTranslation();
  const gameId = useId();
  const appId = useId();
  const toolsId = useId();
  return (
    <>
      <h2>{t("settings.title")}</h2>
      <section className="settings-group" aria-labelledby={gameId}>
        <h3 id={gameId}>{t("settings.game")}</h3>
        <div className="settings-list">
          <ChoiceRow
            icon={ListFilter}
            title={t("settings.level")}
            value={level}
            options={Object.entries(bingoLevels).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => {
              if (value === "beginner" || value === "expert")
                onLevelChange(value);
            }}
          />
          <ActionRow
            icon={Grid3X3}
            title={t("settings.board")}
            description={t("settings.boardHint")}
            value={`${size} × ${size}`}
            onClick={onNewGame}
          />
          <ActionRow
            icon={Clock3}
            title={t("settings.roundTime")}
            value={t("settings.timeValue", { seconds: roundDurationMs / 1000 })}
            onClick={onEditTime}
          />
          <label className="settings-row settings-row-sound">
            <Volume2
              className="settings-row-icon"
              size={20}
              aria-hidden="true"
            />
            <span className="settings-row-copy">
              <span className="settings-row-title">{t("play.sound")}</span>
              <span className="settings-row-description">
                {t("settings.soundHint")}
              </span>
            </span>
            <input
              className="settings-switch"
              type="checkbox"
              role="switch"
              checked={sound}
              onChange={onSoundChange}
            />
          </label>
        </div>
        {!soundSaved && (
          <p className="error" role="status">
            {t("settings.preferenceSaveFailed")}
          </p>
        )}
      </section>
      <section className="settings-group" aria-labelledby={appId}>
        <h3 id={appId}>{t("settings.app")}</h3>
        <div className="settings-list">
          <ChoiceRow
            icon={Languages}
            title={t("shell.language")}
            value={language}
            options={[
              { value: "pl", label: "Polski" },
              { value: "en", label: "English" },
            ]}
            onChange={(value) => {
              if (value === "pl" || value === "en") onLanguageChange(value);
            }}
          />
          <PwaControls />
        </div>
      </section>
      <section className="settings-group" aria-labelledby={toolsId}>
        <h3 id={toolsId}>{t("settings.tools")}</h3>
        <div className="settings-list">
          <ActionRow
            icon={Printer}
            title={t("bingoApp.boards")}
            description={t("settings.printHint")}
            onClick={onOpenPrint}
          />
          <ActionRow
            icon={CircleHelp}
            title={t("components.BingoGame.howToPlay")}
            description={t("settings.helpHint")}
            onClick={onOpenHelp}
          />
          <ActionRow
            icon={Grid3X3}
            title={t("shell.createCards")}
            href={hiciarzUrl("editor", language)}
          />
          <ActionRow
            icon={Coffee}
            title={t("shell.buyCoffee")}
            href="https://buymeacoffee.com/szymonrybka"
          />
        </div>
      </section>
    </>
  );
}
