import { t as translate, localizedRecord } from "./i18n";
export type BingoLevel = "beginner" | "expert";
export const bingoSizes = [3, 4, 5] as const;
export type BingoSize = (typeof bingoSizes)[number];
export function isBingoSize(value: unknown): value is BingoSize {
  return value === 3 || value === 4 || value === 5;
}
export const bingoLevels = localizedRecord(
  ["beginner", "expert"] as const,
  "bingo.levels.",
);
export const bingoCategories = {
  beginner: [
    {
      get name() {
        return translate("bingo.categories.beginner.0.name");
      },
      get short() {
        return translate("bingo.categories.beginner.0.short");
      },
      get hint() {
        return translate("bingo.categories.beginner.0.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.beginner.1.name");
      },
      get short() {
        return translate("bingo.categories.beginner.1.short");
      },
      get hint() {
        return translate("bingo.categories.beginner.1.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.beginner.2.name");
      },
      get short() {
        return translate("bingo.categories.beginner.2.short");
      },
      get hint() {
        return translate("bingo.categories.beginner.2.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.beginner.3.name");
      },
      get short() {
        return translate("bingo.categories.beginner.3.short");
      },
      get hint() {
        return translate("bingo.categories.beginner.3.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.beginner.4.name");
      },
      get short() {
        return translate("bingo.categories.beginner.4.short");
      },
      get hint() {
        return translate("bingo.categories.beginner.4.hint");
      },
    },
  ],
  expert: [
    {
      get name() {
        return translate("bingo.categories.expert.0.name");
      },
      get short() {
        return translate("bingo.categories.expert.0.short");
      },
      get hint() {
        return translate("bingo.categories.expert.0.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.expert.1.name");
      },
      get short() {
        return translate("bingo.categories.expert.1.short");
      },
      get hint() {
        return translate("bingo.categories.expert.1.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.expert.2.name");
      },
      get short() {
        return translate("bingo.categories.expert.2.short");
      },
      get hint() {
        return translate("bingo.categories.expert.2.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.expert.3.name");
      },
      get short() {
        return translate("bingo.categories.expert.3.short");
      },
      get hint() {
        return translate("bingo.categories.expert.3.hint");
      },
    },
    {
      get name() {
        return translate("bingo.categories.expert.4.name");
      },
      get short() {
        return translate("bingo.categories.expert.4.short");
      },
      get hint() {
        return translate("bingo.categories.expert.4.hint");
      },
    },
  ],
} as const;
export const bingoColors = [
  { fill: "#e0ebdf", ink: "#31583d" },
  { fill: "#f5e5c2", ink: "#745521" },
  { fill: "#dce8f4", ink: "#355875" },
  { fill: "#eedfee", ink: "#714570" },
  { fill: "#f4ddd2", ink: "#804d39" },
];
export function randomBingoCategory(
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error(translate("bingo.randomFailed"));
  return Math.floor(value * 5);
}
/** Reproducible layouts keep all five categories balanced, including smaller boards. */
export function bingoBoard(seed: string, size: BingoSize = 5): number[] {
  if (!isBingoSize(size)) throw new Error("Invalid Bingo size");
  let state = 2166136261;
  for (const c of seed)
    state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const randomIndex = (length: number) => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * length);
  };
  const categories = [0, 1, 2, 3, 4];
  // Leave the legacy 5×5 shuffle untouched so saved seeds retain their layouts.
  // Smaller boards choose which categories get the extra cells from their seed.
  if (size !== 5)
    for (let i = categories.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [categories[i], categories[j]] = [categories[j], categories[i]];
    }
  const cells = Array.from(
    { length: size * size },
    (_, i) => categories[i % 5],
  );
  for (let i = cells.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
