import { useId, useMemo, type CSSProperties } from "react";
import {
  bingoBoard,
  bingoCategories,
  bingoColors,
  type BingoLevel,
} from "./bingo";
import { winningLines, type BingoPlayer } from "./bingo-play";
import { useTranslation } from "./i18n";
import "./bingo-board.css";

export type BingoBoardProps = {
  player: BingoPlayer;
  level: BingoLevel;
  mode: "mark" | "erase" | "correct";
  activeCategory: number | null;
  enabled: (index: number) => boolean;
  onCell: (index: number) => void;
};

export default function BingoBoard({
  player,
  level,
  mode,
  activeCategory,
  enabled,
  onCell,
}: BingoBoardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const cells = useMemo(() => bingoBoard(player.seed), [player.seed]);
  const marked = useMemo(() => new Set(player.marks), [player.marks]);
  const winners = useMemo(
    () => new Set(winningLines(player.marks).flat()),
    [player.marks],
  );
  const hasBingo = winners.size > 0;

  return (
    <section
      className={"digital-bingo-board" + (hasBingo ? " has-bingo" : "")}
      aria-labelledby={headingId}
      data-player={player.id}
      data-mode={mode}
    >
      <header className="digital-bingo-board-heading">
        <h3 id={headingId}>{player.name}</h3>
        <span
          className="digital-bingo-board-score"
          role="group"
          aria-label={t("board.markedCount", { count: marked.size })}
        >
          <strong aria-hidden="true">{marked.size}</strong>
          <span aria-hidden="true">/ 25</span>
        </span>
      </header>
      <div
        className="digital-bingo-board-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {hasBingo && (
          <>
            <strong aria-hidden="true">Bingo!</strong>
            <span className="sr-only">
              {t("board.bingo", { name: player.name })}
            </span>
          </>
        )}
      </div>
      <div className="digital-bingo-grid">
        {cells.map((category, index) => {
          const isMarked = marked.has(index);
          const isWinning = winners.has(index);
          const canUse = enabled(index);
          const label = bingoCategories[level][category];
          const colors = bingoColors[category];
          const cellStyle = {
            "--cell-fill": colors.fill,
            "--cell-ink": colors.ink,
          } as CSSProperties;
          return (
            <button
              key={index}
              type="button"
              className={
                "digital-bingo-cell" +
                (isMarked ? " is-marked" : "") +
                (isWinning ? " is-winning" : "") +
                (activeCategory === category ? " is-current-category" : "")
              }
              style={cellStyle}
              disabled={!canUse}
              aria-pressed={isMarked}
              aria-label={t("board.cell", {
                row: Math.floor(index / 5) + 1,
                column: (index % 5) + 1,
                category: category + 1,
                name: label.name,
                state: t(isMarked ? "board.marked" : "board.unmarked"),
                action: t(`board.action.${mode}`),
              })}
              data-cell={index}
              data-category={category}
              data-winning={isWinning || undefined}
              onClick={() => onCell(index)}
            >
              <span className="digital-bingo-cell-top" aria-hidden="true">
                <span className="digital-bingo-cell-number">
                  {category + 1}
                </span>
                <span className="digital-bingo-cell-mark">
                  {isMarked && (
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                      <path d="M5 5L19 19M19 5L5 19" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="digital-bingo-cell-label" aria-hidden="true">
                {label.short}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
