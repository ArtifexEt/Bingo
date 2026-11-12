import { readFileSync } from "node:fs";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  bingoPageLayouts,
  buildBingoPDF,
  type BingoBoardsPerPage,
} from "./bingo-pdf";
import { setLanguage } from "./i18n";
import { bingoSizes, type BingoSize } from "./bingo";
const font = readFileSync(
  new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url),
);
vi.stubGlobal("fetch", async () => new Response(font));
afterAll(() => vi.unstubAllGlobals());
afterEach(() => setLanguage("pl"));
describe("printable Bingo boards", () => {
  it("prints two complete boards per A4 page, including odd counts and both levels", async () => {
    for (const level of ["beginner", "expert"] as const) {
      const doc = await buildBingoPDF(level, 3, "stable-seed");
      expect(doc.getNumberOfPages()).toBe(2);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0);
      expect(doc.output()).toContain("/Title (Bingo - plansze graczy)");
    }
  });
  it.each(bingoPageLayouts)(
    "paginates complete and partial sheets with %i boards per page",
    async (boardsPerPage) => {
      for (const level of ["beginner", "expert"] as const) {
        for (const boardSize of bingoSizes) {
          for (const count of [1, 3, 5]) {
            const doc = await buildBingoPDF(level, count, "layout-seed", {
              boardsPerPage,
              boardSize,
            });
            expect(doc.getNumberOfPages()).toBe(
              Math.ceil(count / boardsPerPage),
            );
            expect(doc.output()).toContain(
              `/Subject (Plansze na A4: ${boardsPerPage}.`,
            );
            // Each filled-and-stroked shape is a grid cell or one of five legend chips.
            const pages = doc.internal.pages as unknown as string[][];
            pages.slice(1).forEach((commands, page) => {
              const boards = Math.min(
                boardsPerPage,
                count - page * boardsPerPage,
              );
              const legendChips = boardsPerPage === 4 ? 0 : 5;
              expect(
                commands.filter((command) => command === "B"),
              ).toHaveLength(boards * (boardSize ** 2 + legendChips));
            });
          }
        }
      }
    },
  );
  it("rejects unsupported board sizes before producing a PDF", async () => {
    for (const boardSize of [0, 2, 6, 3.5, NaN, "3", null]) {
      await expect(
        buildBingoPDF("beginner", 1, "invalid-size", {
          boardSize: boardSize as BingoSize,
        }),
      ).rejects.toThrow();
    }
  });
  it("rejects unsupported page layouts instead of silently changing the requested print size", async () => {
    for (const boardsPerPage of [0, 3, 6, NaN]) {
      await expect(
        buildBingoPDF("beginner", 4, "invalid-layout", {
          boardsPerPage: boardsPerPage as BingoBoardsPerPage,
        }),
      ).rejects.toThrow("Wybierz 1, 2 lub 4");
    }
  });
  it("bounds a print job rather than creating empty or unbounded PDFs", async () => {
    for (const n of [0, -1, 1.5, 25, NaN])
      await expect(buildBingoPDF("beginner", n)).rejects.toThrow();
  });
  it("keeps the export language fixed while the app language changes", async () => {
    setLanguage("en");
    const pending = buildBingoPDF("expert", 3, "english-export", {
      boardSize: 4,
    });
    setLanguage("pl");
    const doc = await pending;
    expect(doc.output()).toContain("/Title (Bingo - player boards)");
    expect(doc.output()).toContain("/Subject (Boards per A4 sheet: 2.");
    expect(doc.getNumberOfPages()).toBe(2);
  });
  it("cancels between boards and permits another print job", async () => {
    const controller = new AbortController();
    await expect(
      buildBingoPDF("expert", 24, "cancel-test", {
        signal: controller.signal,
        onProgress: (completed) => {
          if (completed === 2) controller.abort();
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    const retry = await buildBingoPDF("expert", 1);
    expect(retry.getNumberOfPages()).toBe(1);
  });
});
