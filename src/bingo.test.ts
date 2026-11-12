import { describe, expect, it } from "vitest";
import {
  bingoBoard,
  bingoCategories,
  bingoSizes,
  isBingoSize,
  randomBingoCategory,
} from "./bingo";
describe("Bingo MVP", () => {
  it("draws all five categories within the random range for either level", () => {
    for (let i = 0; i < 5; i++) {
      const category = randomBingoCategory(() => i / 5 + 0.01);
      expect(category).toBe(i);
      for (const level of ["beginner", "expert"] as const)
        expect(bingoCategories[level][category].name).toBeTruthy();
    }
    for (const value of [-1, 1, NaN, Infinity])
      expect(() => randomBingoCategory(() => value)).toThrow();
  });
  it("creates distinct, reproducible 5×5 paper boards with five cells of each category", () => {
    const boards = Array.from({ length: 24 }, (_, i) =>
      bingoBoard("board-" + i),
    );
    for (const board of boards) {
      expect(board).toHaveLength(25);
      for (let category = 0; category < 5; category++)
        expect(board.filter((c) => c === category)).toHaveLength(5);
    }
    expect(new Set(boards.map((b) => b.join(""))).size).toBe(24);
    expect(bingoBoard("board-1")).toEqual(boards[1]);
  });

  it("keeps existing 5×5 layouts unchanged when loading old saved seeds", () => {
    const legacyBoards = [
      {
        seed: "board-1",
        cells: [
          1, 2, 2, 0, 2, 0, 2, 3, 2, 3, 4, 4, 1, 4, 1, 1, 3, 0, 4, 4, 3, 0, 1,
          3, 0,
        ],
      },
      {
        seed: "reproducible-game:1",
        cells: [
          1, 0, 3, 3, 2, 0, 4, 3, 4, 1, 3, 2, 1, 1, 1, 3, 4, 4, 0, 2, 4, 0, 2,
          2, 0,
        ],
      },
      {
        seed: "legacy café 🎵",
        cells: [
          4, 1, 0, 1, 3, 1, 4, 2, 4, 2, 4, 0, 3, 3, 1, 2, 0, 0, 3, 2, 1, 0, 3,
          2, 4,
        ],
      },
    ];
    for (const { seed, cells } of legacyBoards) {
      expect(bingoBoard(seed)).toEqual(cells);
      expect(bingoBoard(seed, 5)).toEqual(cells);
    }
  });

  it("offers only supported square board sizes", () => {
    expect(bingoSizes).toEqual([3, 4, 5]);
    for (const size of [3, 4, 5]) expect(isBingoSize(size)).toBe(true);
    for (const size of [0, 2, 6, 3.5, "3", null, undefined, NaN, Infinity])
      expect(isBingoSize(size)).toBe(false);
  });

  it.each([3, 4] as const)(
    "creates reproducible size-%s boards with balanced, seed-dependent category counts",
    (size) => {
      const minimum = Math.floor((size * size) / 5);
      const extraPatterns = new Set<string>();
      for (let index = 0; index < 64; index++) {
        const seed = `small-board-${index}`;
        const board = bingoBoard(seed, size);
        expect(board).toHaveLength(size * size);
        expect(bingoBoard(seed, size)).toEqual(board);
        expect(
          board.every(
            (category) =>
              Number.isInteger(category) && category >= 0 && category < 5,
          ),
        ).toBe(true);
        const counts = Array.from(
          { length: 5 },
          (_, category) => board.filter((cell) => cell === category).length,
        );
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
          1,
        );
        expect(
          counts.every((count) => count === minimum || count === minimum + 1),
        ).toBe(true);
        extraPatterns.add(
          counts.map((count) => (count > minimum ? "1" : "0")).join(""),
        );
      }
      // Small boards must not always favour the same category with their remainder.
      expect(extraPatterns.size).toBeGreaterThan(1);
    },
  );
});
