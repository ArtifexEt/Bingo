import type { CSSProperties } from "react";
import { bingoCategories, bingoColors, type BingoLevel } from "./bingo";
import type { BingoRound } from "./bingo-play";
import { useTranslation } from "./i18n";
import "./round-status.css";

export default function RoundStatus({
  level,
  round,
  now,
}: {
  level: BingoLevel;
  round: BingoRound;
  now: number;
}) {
  const { t } = useTranslation();
  if (round.category === null) return null;
  const category = bingoCategories[level][round.category];
  const colors = bingoColors[round.category];
  const remaining =
    round.phase === "checking"
      ? 0
      : round.deadline === null
        ? round.remainingMs
        : Math.max(0, round.deadline - now);
  const seconds = Math.ceil(remaining / 1_000);
  const state =
    round.phase === "checking"
      ? "checking"
      : round.phase === "ready"
        ? "ready"
        : seconds === 0
          ? "timeUp"
          : round.deadline === null
            ? "paused"
            : "running";
  const status = {
    checking: "play.roundChecking",
    ready: "play.roundReady",
    timeUp: "play.roundTimeUp",
    paused: "play.roundPaused",
    running: "play.roundRunning",
  }[state];

  return (
    <section
      className={`round-status${seconds <= 5 && state === "running" ? " is-ending" : ""}`}
      aria-label={t("play.round", { n: round.number || 1 })}
      data-state={state}
      style={
        {
          "--round-fill": colors.fill,
          "--round-ink": colors.ink,
        } as CSSProperties
      }
    >
      <div className="round-status-question">
        <span className="round-status-label">
          {t("play.round", { n: round.number || 1 })}
          <span aria-hidden="true"> · </span>
          {t("play.category", { n: round.category + 1 })}
        </span>
        <strong>{category.short}</strong>
        <span className="round-status-phase">{t(status)}</span>
      </div>
      <div
        className="round-status-clock"
        role="timer"
        aria-live="off"
        aria-label={t("play.secondsLeft", { seconds })}
      >
        <strong aria-hidden="true">
          {seconds.toString().padStart(2, "0")}
        </strong>
        <span aria-hidden="true">{t("play.seconds")}</span>
      </div>
    </section>
  );
}
