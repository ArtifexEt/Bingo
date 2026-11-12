import { describe, expect, it } from "vitest";
import {
  answerKind,
  parseAnswer,
  serializeAnswer,
  validAnswer,
} from "./answer";
import { MAX_ANSWER_LENGTH } from "./bingo-play";

describe("private typed answers", () => {
  it("uses the correct input type for every category", () => {
    expect(
      [0, 1, 2, 3, 4].map((category) => answerKind("beginner", category)),
    ).toEqual(["artistType", "before2000", "year", "decade", "year"]);
    expect(
      [0, 1, 2, 3, 4].map((category) => answerKind("expert", category)),
    ).toEqual(["text", "year", "text", "decade", "year"]);
  });

  it.each([
    ["beginner", 0, "band"],
    ["beginner", 0, "solo"],
    ["beginner", 1, "yes"],
    ["beginner", 1, "no"],
    ["beginner", 2, "1984"],
    ["beginner", 3, "1990"],
    ["beginner", 4, "2000"],
    ["expert", 0, "Song title"],
    ["expert", 1, "2001"],
    ["expert", 2, "Kate Bush"],
    ["expert", 3, "1970"],
    ["expert", 4, "2010"],
  ] as const)(
    "round-trips %s category %s without losing its type",
    (level, category, value) => {
      const serialized = serializeAnswer(level, category, value);
      expect(serialized).not.toBeNull();
      expect(serialized!.length).toBeLessThanOrEqual(MAX_ANSWER_LENGTH);
      expect(parseAnswer(serialized!, level)).toEqual({ category, value });
    },
  );

  it("preserves legacy text answers and trims typed text before saving", () => {
    expect(parseAnswer("  Running Up That Hill  ", "expert")).toEqual({
      category: null,
      value: "Running Up That Hill",
    });
    expect(parseAnswer("1984", "beginner")).toEqual({
      category: null,
      value: "1984",
    });
    expect(
      parseAnswer(serializeAnswer("expert", 2, "  Kate Bush  ")!, "expert"),
    ).toEqual({
      category: 2,
      value: "Kate Bush",
    });
  });

  it("rejects invalid categories, binary choices and calendar values", () => {
    for (const category of [-1, 5, 1.5, NaN])
      expect(serializeAnswer("beginner", category, "yes")).toBeNull();
    expect(validAnswer("beginner", 0, "yes")).toBe(false);
    expect(validAnswer("beginner", 1, "solo")).toBe(false);
    for (const value of ["1899", "1984.5", "1e3", "abcd", "", "  "])
      expect(validAnswer("beginner", 2, value, 2026)).toBe(false);
    expect(validAnswer("beginner", 2, "2027", 2026)).toBe(false);
    expect(validAnswer("beginner", 2, "2026", 2026)).toBe(true);
    expect(validAnswer("expert", 3, "1984", 2026)).toBe(false);
    expect(validAnswer("expert", 3, "2020", 2026)).toBe(true);
  });

  it("rejects broken typed data and data from another level", () => {
    for (const raw of [
      "",
      "{",
      '{"v":2,"l":"expert","c":0,"value":"Title"}',
      '{"v":1,"l":"expert","c":5,"value":"Title"}',
      '{"v":1,"l":"expert","c":0,"value":4}',
      '{"v":1,"l":"expert","c":0,"value":"Title","extra":true}',
      '{"v":1,"l":"beginner","c":0,"value":"band"}',
      '{"v":1,"l":"expert","c":1,"value":"abcd"}',
    ])
      expect(parseAnswer(raw, "expert")).toBeNull();
  });

  it("enforces the existing save limit after JSON escaping", () => {
    expect(serializeAnswer("expert", 0, "x".repeat(240))).toBeNull();
    expect(serializeAnswer("expert", 0, "\\".repeat(110))).toBeNull();
    expect(parseAnswer("x".repeat(MAX_ANSWER_LENGTH + 1), "expert")).toBeNull();
    expect(parseAnswer("secret\u0000answer", "expert")).toBeNull();
    const answer = serializeAnswer("expert", 0, "Zażółć gęślą jaźń 🎵");
    expect(parseAnswer(answer!, "expert")?.value).toBe("Zażółć gęślą jaźń 🎵");
  });
});
