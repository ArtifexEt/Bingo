import { displayTranslation, t, useTranslation } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { CircleHelp, Download, LoaderCircle, Printer } from "lucide-react";
import { bingoLevels, type BingoLevel } from "./bingo";
import { preparePDFPreview } from "./pdf-preview";
import type { BingoBoardsPerPage } from "./bingo-pdf";
import Modal from "./Modal";
import BingoPlay from "./BingoPlay";
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
  const [count, setCount] = useState(4);
  const [boardsPerPage, setBoardsPerPage] = useState<BingoBoardsPerPage>(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const printController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (sheet !== "print") printController.current?.abort();
  }, [sheet]);
  useEffect(() => () => printController.current?.abort(), []);
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
      <BingoPlay
        level={level}
        onLevelChange={onLevelChange}
        scannerUrl={scannerUrl}
      />
      {sheet === "help" && (
        <Modal
          title={t("components.BingoGame.howToPlay")}
          onClose={() => onSheetChange(null)}
          sheet
        >
          <div className="bingo-help">
            <p>{t("components.BingoGame.drawACategoryAndScanA")}</p>
            <p>{t("components.BingoGame.atBeginnerLevelGuessingTheExact")}</p>
            <p>{t("play.helpDigital")}</p>
            <p>{t("play.helpTie")}</p>
            <a
              className="bingo-rules-link"
              href="https://hitstergame.com/pl-pl/pages/zasady-gry-bingo"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("play.officialRules")}
            </a>
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
