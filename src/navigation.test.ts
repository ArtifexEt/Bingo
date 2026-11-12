import { describe, expect, it } from "vitest";
import { hiciarzUrl, parseRoute, routeHref } from "./navigation";

describe("standalone Bingo links", () => {
  it("opens shared print settings, including links from the former Hiciarz view", () => {
    expect(
      parseRoute(
        "https://artifexet.github.io/Bingo/?view=bingo&sheet=print&level=expert&lang=en",
      ),
    ).toEqual({ sheet: "print", level: "expert", language: "en" });
    expect(
      parseRoute(
        "https://artifexet.github.io/Bingo/?sheet=help&lang=pl",
        "expert",
      ),
    ).toEqual({ sheet: "help", level: "expert", language: "pl" });
  });

  it("validates URL settings and removes unrelated parameters from shared links", () => {
    const route = parseRoute(
      "https://artifexet.github.io/Bingo/?level=invalid&sheet=unknown&lang=xx#token",
      "expert",
    );
    expect(route).toEqual({
      sheet: null,
      level: "expert",
      language: undefined,
    });
    expect(routeHref("/Bingo/", route, "en")).toBe(
      "/Bingo/?level=expert&lang=en",
    );
    expect(parseRoute("/Bingo/", "invalid").level).toBe("beginner");
  });

  it("links only the selected language and destination to Hiciarz", () => {
    expect(hiciarzUrl("scanner", "en")).toBe(
      "https://artifexet.github.io/Hiciarz/?view=scanner&lang=en",
    );
    expect(hiciarzUrl("editor", "pl")).toBe(
      "https://artifexet.github.io/Hiciarz/?view=editor&lang=pl",
    );
  });
});
