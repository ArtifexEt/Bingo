import { afterEach, describe, expect, it } from "vitest";
import { bingoCategories, bingoLevels } from "./bingo";
import { dictionaries, languageStorageKey, setLanguage, t } from "./i18n";

afterEach(() => setLanguage("pl"));

describe("standalone Bingo translations", () => {
  it("has matching Polish and English keys and its own preferences namespace", () => {
    expect(Object.keys(dictionaries.pl).sort()).toEqual(
      Object.keys(dictionaries.en).sort(),
    );
    expect(languageStorageKey).toBe("bingo-language");
    for (const dictionary of Object.values(dictionaries))
      expect(
        Object.values(dictionary).every((value) => Boolean(value.trim())),
      ).toBe(true);
  });

  it("switches level labels and question names without reloading the modules", () => {
    expect(bingoLevels.beginner).toBe("Na dobry początek");
    const polishQuestion = bingoCategories.beginner[0].name;
    setLanguage("en");
    expect(bingoLevels.beginner).toBe("Getting started");
    expect(bingoCategories.beginner[0].name).not.toBe(polishQuestion);
    expect(t("document.title")).toContain("Bingo");
    expect(t("bingoPdf.title")).not.toContain("Hiciarz");
  });
});
