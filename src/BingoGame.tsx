import { displayTranslation, t, useTranslation } from "./i18n";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  CircleHelp,
  Grid3X3,
  Download,
  LoaderCircle,
  Printer,
  ScanLine,
  Shuffle,
} from "lucide-react";
import {
  bingoCategories,
  bingoColors,
  bingoLevels,
  randomBingoCategory,
  type BingoLevel,
} from "./bingo";
import { preparePDFPreview } from "./pdf-preview";
import type { BingoBoardsPerPage } from "./bingo-pdf";
import Modal from "./Modal";
import "./bingo.css";

export type BingoSheet = "help" | "print" | null;

export default function BingoGame({
  scannerUrl,
  sheet,
  onSheetChange,
  level,
  onLevelChange,
}: {
  scannerUrl: string;
  sheet: BingoSheet;
  onSheetChange: (sheet: BingoSheet) => void;
  level: BingoLevel;
  onLevelChange: (level: BingoLevel) => void;
}) {
  useTranslation();
  const [selected, setSelected] = useState<number>();
  const [draws, setDraws] = useState(0);
  const [count, setCount] = useState(4);
  const [boardsPerPage, setBoardsPerPage] = useState<BingoBoardsPerPage>(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const printController = useRef<AbortController | null>(null);
  useEffect(() => {
    setSelected(undefined);
    setDraws(0);
  }, [level]);
  useEffect(() => {
    if (sheet !== "print") printController.current?.abort();
  }, [sheet]);
  useEffect(() => () => printController.current?.abort(), []);
  const category =
    selected === undefined ? undefined : bingoCategories[level][selected];
  const color = selected === undefined ? undefined : bingoColors[selected];
  function draw() {
    try {
      setSelected(randomBingoCategory());
      setDraws((n) => n + 1);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function print(preview = false) {
    if (busy) return;
    setError("");
    const controller = new AbortController();
    printController.current = controller;
    const viewer = preview ? preparePDFPreview(() => controller.abort()) : null;
    if (preview && !viewer) {
      setError(t("components.BingoGame.couldNotOpenThePreviewDownload"));
      return;
    }
    setBusy(true);
    try {
      const { buildBingoPDF } = await import("./bingo-pdf");
      const doc = await buildBingoPDF(level, count, crypto.randomUUID(), {
        boardsPerPage,
        signal: controller.signal,
        onProgress: (completed) =>
          viewer?.update({
            completed,
            total: count,
            percent: Math.floor((completed / count) * 95),
          }),
      });
      if (viewer) viewer.show(doc.output("blob"));
      else await doc.save("bingo-plansze.pdf", { returnPromise: true });
    } catch (e) {
      viewer?.close();
      setError(
        controller.signal.aborted
          ? t("components.BingoGame.boardPreparationCancelled")
          : (e as Error).message,
      );
    } finally {
      if (printController.current === controller)
        printController.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="bingo-shell" aria-labelledby="bingo-title">
      <header className="bingo-heading">
        <h1 id="bingo-title">{t("components.BingoGame.musicBingo")}</h1>
        <div className="bingo-tools">
          <button
            className="bingo-tool"
            type="button"
            aria-label={t("components.BingoGame.howToPlay")}
            aria-haspopup="dialog"
            onClick={() => onSheetChange("help")}
          >
            <CircleHelp size={21} aria-hidden="true" />
          </button>
          <button
            className="bingo-tool bingo-boards-entry"
            type="button"
            aria-haspopup="dialog"
            onClick={() => onSheetChange("print")}
          >
            <Printer size={21} aria-hidden="true" />
            <span>{t("bingoApp.boards")}</span>
          </button>
        </div>
      </header>
      <div className="bingo-draw-panel">
        <fieldset className="bingo-level">
          <legend className="sr-only">
            {t("components.BingoGame.questionLevel")}
          </legend>
          {Object.entries(bingoLevels).map(([value, name]) => (
            <label className="bingo-level-option" key={value}>
              <input
                type="radio"
                name="bingo-level"
                value={value}
                checked={level === value}
                onChange={() => {
                  onLevelChange(value as BingoLevel);
                }}
              />
              <span>{name}</span>
            </label>
          ))}
        </fieldset>
        <div
          id="bingo-question"
          className={"bingo-question" + (category ? " selected" : " is-empty")}
          style={
            color
              ? ({
                  "--question-fill": color.fill,
                  "--question-ink": color.ink,
                } as CSSProperties)
              : undefined
          }
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {category ? (
            <>
              <span className="bingo-category-number">
                {t("components.BingoGame.draw")} {draws}{" "}
                {t("components.BingoGame.category")} {selected! + 1}
              </span>
              <h2>{category.name}</h2>
              <p>{category.hint}</p>
            </>
          ) : (
            <>
              <Grid3X3
                className="bingo-empty-symbol"
                size={40}
                strokeWidth={1.4}
                aria-hidden="true"
              />
              <h2>{t("bingoApp.emptyQuestion")}</h2>
            </>
          )}
        </div>
        <div className="bingo-game-actions">
          <button
            className="primary bingo-draw-button"
            aria-controls="bingo-question"
            onClick={draw}
          >
            <Shuffle size={21} aria-hidden="true" />
            {category
              ? t("components.BingoGame.drawAnotherChallenge")
              : t("components.BingoGame.drawAChallenge")}
          </button>
          <a
            className="bingo-scanner-link"
            href={scannerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ScanLine size={19} aria-hidden="true" /> {t("bingoApp.scanCard")}{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          {error && !sheet && (
            <p className="error" role="alert">
              {displayTranslation(error)}
            </p>
          )}
        </div>
      </div>
      {sheet === "help" && (
        <Modal
          title={t("components.BingoGame.howToPlay")}
          onClose={() => onSheetChange(null)}
          sheet
        >
          <div className="bingo-help">
            <p>{t("components.BingoGame.drawACategoryAndScanA")}</p>
            <p>{t("components.BingoGame.atBeginnerLevelGuessingTheExact")}</p>
          </div>
        </Modal>
      )}
      {sheet === "print" && (
        <Modal
          title={t("components.BingoGame.printableBoards")}
          onClose={() => onSheetChange(null)}
          sheet
        >
          <div className="bingo-print">
            <div className="bingo-print-row">
              <label>
                {t("components.BingoGame.numberOfBoards")}
                <input
                  type="number"
                  min={1}
                  max={24}
                  disabled={busy}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <label>
                {t("bingoApp.boardsPerPage")}
                <select
                  value={boardsPerPage}
                  disabled={busy}
                  onChange={(e) =>
                    setBoardsPerPage(
                      Number(e.target.value) as BingoBoardsPerPage,
                    )
                  }
                >
                  {[1, 2, 4].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                {t("components.BingoGame.level")}{" "}
                <strong>{bingoLevels[level]}</strong>
              </span>
            </div>
            {error && (
              <p className="error" role="alert">
                {displayTranslation(error)}
              </p>
            )}
            <div className="bingo-print-actions">
              <button
                className="secondary"
                disabled={
                  busy || !Number.isInteger(count) || count < 1 || count > 24
                }
                onClick={() => void print()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Download size={17} />
                )}{" "}
                {busy
                  ? t("components.BingoGame.preparingBoards")
                  : t("components.BingoGame.downloadBoardPDF")}
              </button>
              {busy && (
                <button
                  className="quiet"
                  type="button"
                  onClick={() => printController.current?.abort()}
                >
                  {t("shell.cancel")}
                </button>
              )}
              <button
                className="quiet"
                disabled={
                  busy || !Number.isInteger(count) || count < 1 || count > 24
                }
                onClick={() => void print(true)}
              >
                <Printer size={17} aria-hidden="true" />{" "}
                {t("components.BingoGame.openForPrinting")}
              </button>
            </div>
            <p className="bingo-print-hint">
              {t("components.BingoGame.singlesidedPrinting100ScaleLightUse")}
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}
