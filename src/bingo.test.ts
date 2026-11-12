import { describe, expect, it } from "vitest";
import { bingoBoard, bingoCategories, randomBingoCategory } from "./bingo";
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
});
