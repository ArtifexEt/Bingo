import { t as translate, localizedRecord } from "./i18n";
export type BingoLevel = "beginner" | "expert";
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
/** Each paper board has five cells of each category, in a reproducible shuffled layout. */
export function bingoBoard(seed: string): number[] {
  let state = 2166136261;
  for (const c of seed)
    state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const cells = Array.from({ length: 25 }, (_, i) => i % 5);
  for (let i = 24; i > 0; i--) {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
