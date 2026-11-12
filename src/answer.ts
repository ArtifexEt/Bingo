import type { BingoLevel } from "./bingo";
import { MAX_ANSWER_LENGTH } from "./bingo-play";

export type AnswerKind =
  | "artistType"
  | "before2000"
  | "year"
  | "decade"
  | "text";
export type SavedAnswer = { category: number | null; value: string };

export function answerKind(level: BingoLevel, category: number): AnswerKind {
  if (category === 3) return "decade";
  if (level === "beginner") {
    if (category === 0) return "artistType";
    if (category === 1) return "before2000";
    return "year";
  }
  return category === 1 || category === 4 ? "year" : "text";
}

export function validAnswer(
  level: BingoLevel,
  category: number,
  value: string,
  year = new Date().getFullYear(),
): boolean {
  if (
    !Number.isInteger(category) ||
    category < 0 ||
    category > 4 ||
    !value.trim() ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return false;
  const kind = answerKind(level, category);
  if (kind === "artistType") return value === "band" || value === "solo";
  if (kind === "before2000") return value === "yes" || value === "no";
  if (kind === "year" || kind === "decade") {
    if (!/^\d{4}$/.test(value)) return false;
    const number = Number(value);
    return (
      number >= 1900 &&
      number <= year &&
      (kind !== "decade" || number % 10 === 0)
    );
  }
  return value.length <= MAX_ANSWER_LENGTH;
}

/** Short keys leave room for the answer within the existing 240-character save limit. */
export function serializeAnswer(
  level: BingoLevel,
  category: number,
  value: string,
): string | null {
  const clean = value.trim();
  if (!validAnswer(level, category, clean)) return null;
  const encoded = JSON.stringify({ v: 1, l: level, c: category, value: clean });
  return encoded.length <= MAX_ANSWER_LENGTH ? encoded : null;
}

export function parseAnswer(
  raw: string,
  level: BingoLevel,
): SavedAnswer | null {
  if (
    !raw.trim() ||
    raw.length > MAX_ANSWER_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(raw)
  )
    return null;
  if (!raw.trimStart().startsWith("{"))
    return { category: null, value: raw.trim() };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const item = value as Record<string, unknown>;
    if (
      Object.keys(item).length !== 4 ||
      item.v !== 1 ||
      item.l !== level ||
      typeof item.c !== "number" ||
      typeof item.value !== "string" ||
      !validAnswer(level, item.c, item.value)
    )
      return null;
    return { category: item.c, value: item.value };
  } catch {
    return null;
  }
}
