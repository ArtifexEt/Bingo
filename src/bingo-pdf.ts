import { createTranslator } from "./i18n";
import { jsPDF } from "jspdf";
import { pdfFont, yieldForPDF } from "./pdf-support";
import {
  bingoBoard,
  bingoCategories,
  bingoColors,
  bingoLevels,
  type BingoLevel,
} from "./bingo";

export const bingoPageLayouts = [1, 2, 4] as const;
export type BingoBoardsPerPage = (typeof bingoPageLayouts)[number];
type BingoCategory = { short: string };

function drawGrid(
  doc: jsPDF,
  board: number[],
  categories: readonly BingoCategory[],
  x: number,
  y: number,
  size: number,
  compact = false,
) {
  const cellSize = size / 5;
  board.forEach((cat, cell) => {
    const cx = x + (cell % 5) * cellSize;
    const cy = y + Math.floor(cell / 5) * cellSize;
    const colors = bingoColors[cat];
    doc.setFillColor(colors.fill);
    doc.setDrawColor(colors.ink);
    doc.setLineWidth(0.18);
    doc.roundedRect(
      cx + 0.6,
      cy + 0.6,
      cellSize - 1.2,
      cellSize - 1.2,
      2,
      2,
      "FD",
    );
    doc.setTextColor(colors.ink);
    doc.setFontSize(compact ? 11 : size > 100 ? 18 : 12);
    doc.text(String(cat + 1), cx + cellSize / 2, cy + cellSize * 0.45, {
      align: "center",
    });
    doc.setFontSize(compact ? 5.8 : size > 100 ? 9 : 5.3);
    doc.text(categories[cat].short, cx + cellSize / 2, cy + cellSize * 0.75, {
      align: "center",
    });
  });
}

export async function buildBingoPDF(
  level: BingoLevel,
  count: number,
  seed: string = crypto.randomUUID(),
  options: {
    boardsPerPage?: BingoBoardsPerPage;
    signal?: AbortSignal;
    onProgress?: (completed: number) => void;
  } = {},
) {
  const translate = createTranslator();
  const categories = bingoCategories[level].map((category) => ({
    ...category,
  }));
  const levelName = bingoLevels[level];
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error(translate("bingoPdf.count"));
  const perPage = options.boardsPerPage ?? 2;
  if (!bingoPageLayouts.includes(perPage))
    throw new Error(translate("bingoApp.invalidPageLayout"));
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans.ttf", await pdfFont());
  options.signal?.throwIfAborted();
  doc.addFont("NotoSans.ttf", "NotoSans", "normal");
  doc.setFont("NotoSans");
  doc.setProperties({
    title: translate("bingoPdf.title"),
    subject: translate("bingoApp.pdfSubject", { count: perPage }),
  });
  for (let index = 0; index < count; index++) {
    options.signal?.throwIfAborted();
    const slot = index % perPage;
    if (index && slot === 0) doc.addPage();
    const compact = perPage === 4;
    const x = compact ? 10 + (slot % 2) * 100 : 14;
    const width = compact ? 90 : 182;
    const y =
        perPage === 2
          ? slot
            ? 157
            : 14
          : compact
            ? slot >= 2
              ? 157
              : 14
            : 14,
      board = bingoBoard(seed + ":" + index);
    doc.setTextColor("#263d34");
    doc.setFontSize(compact ? 8 : 9);
    doc.text("BINGO", x, y);
    doc.setFontSize(compact ? 7 : 8);
    const boardLabel = translate("bingoPdf.board", {
      level: levelName,
      board: index + 1,
    });
    doc.text(
      boardLabel,
      compact ? x : x + width,
      compact ? y + 6 : y,
      compact ? {} : { align: "right" },
    );
    doc.setDrawColor("#b9c5b8");
    doc.setLineWidth(0.25);
    doc.line(x, y + (compact ? 10 : 4), x + width, y + (compact ? 10 : 4));
    doc.setFontSize(compact ? 7 : 9);
    const player = translate("bingoPdf.player");
    const playerY = y + (compact ? 17 : 11);
    doc.text(player, x, playerY);
    doc.line(
      x + doc.getTextWidth(player) + 4,
      playerY + 1,
      x + (compact ? width : 97),
      playerY + 1,
    );
    const gy = y + (compact ? 22 : 18);
    const gridSize = perPage === 1 ? 182 : compact ? 90 : 100;
    drawGrid(doc, board, categories, x, gy, gridSize, compact);

    if (!compact) {
      doc.setTextColor("#263d34");
      doc.setFontSize(8);
      doc.text(
        translate("bingoPdf.categories"),
        perPage === 1 ? x : 123,
        perPage === 1 ? 224 : gy + 3,
      );
      categories.forEach((cat, i) => {
        const cx = perPage === 1 ? x + i * (width / 5) : 123;
        const cy = perPage === 1 ? 234 : gy + 12 + i * 11;
        doc.setFillColor(bingoColors[i].fill);
        doc.setDrawColor(bingoColors[i].ink);
        doc.roundedRect(cx, cy - 4, 7, 7, 1, 1, "FD");
        doc.setTextColor(bingoColors[i].ink);
        doc.setFontSize(8);
        doc.text(String(i + 1), cx + 3.5, cy + 1, { align: "center" });
        doc.setTextColor("#263d34");
        doc.setFontSize(7);
        doc.text(cat.short, cx + 11, cy + 1);
      });
      doc.setTextColor("#526454");
      doc.setDrawColor("#b9c5b8");
      doc.setFontSize(7.5);
      doc.text(
        translate("bingoPdf.answer"),
        perPage === 1 ? x : 123,
        perPage === 1 ? 249 : gy + 77,
      );
      doc.line(
        perPage === 1 ? x : 123,
        perPage === 1 ? 257 : gy + 88,
        196,
        perPage === 1 ? 257 : gy + 88,
      );
      doc.line(
        perPage === 1 ? x : 123,
        perPage === 1 ? 270 : gy + 99,
        196,
        perPage === 1 ? 270 : gy + 99,
      );
    }
    doc.setTextColor("#526454");
    doc.setFontSize(compact ? 5.8 : 7);
    const rules = doc.splitTextToSize(translate("bingoPdf.rules"), width);
    doc.text(
      rules,
      x,
      perPage === 1 ? 282 : compact ? gy + gridSize + 7 : gy + 108,
    );

    const pageCount = Math.min(perPage, count - (index - slot));
    if (slot === pageCount - 1 && pageCount > 1) {
      doc.setDrawColor("#b9c5b8");
      doc.setLineDashPattern([2, 2], 0);
      if (perPage === 2 || pageCount > 2) doc.line(10, 148, 200, 148);
      if (compact) doc.line(105, 10, 105, 287);
      doc.setLineDashPattern([], 0);
    }
    options.onProgress?.(index + 1);
    await yieldForPDF();
  }
  options.signal?.throwIfAborted();
  return doc;
}
