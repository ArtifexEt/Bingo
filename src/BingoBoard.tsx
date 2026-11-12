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
  board: Pick<BingoPlayer, "seed" | "marks">;
  level: BingoLevel;
  onCell: (index: number) => void;
};

export default function BingoBoard({ board, level, onCell }: BingoBoardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const cells = useMemo(() => bingoBoard(board.seed), [board.seed]);
  const marked = useMemo(() => new Set(board.marks), [board.marks]);
  const winners = useMemo(
    () => new Set(winningLines(board.marks).flat()),
    [board.marks],
  );
  const hasBingo = winners.size > 0;

  return (
    <section
      className={"digital-bingo-board" + (hasBingo ? " has-bingo" : "")}
      aria-labelledby={headingId}
    >
      <header className="digital-bingo-board-heading">
        <h3 id={headingId}>{t("board.title")}</h3>
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
            <span className="sr-only">{t("board.bingo")}</span>
          </>
        )}
      </div>
      <div className="digital-bingo-grid">
        {cells.map((category, index) => {
          const isMarked = marked.has(index);
          const isWinning = winners.has(index);
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
                (isWinning ? " is-winning" : "")
              }
              style={cellStyle}
              aria-pressed={isMarked}
              aria-label={t("board.cell", {
                row: Math.floor(index / 5) + 1,
                column: (index % 5) + 1,
                category: category + 1,
                name: label.name,
                state: t(isMarked ? "board.marked" : "board.unmarked"),
                action: t("board.action.correct"),
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
