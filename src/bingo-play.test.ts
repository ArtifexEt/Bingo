import { describe, expect, it } from "vitest";
import { bingoBoard } from "./bingo";
import {
  BINGO_ROUND_MS,
  MAX_ANSWER_LENGTH,
  correctCell,
  createSession,
  drawRound,
  eraseCell,
  finishRound,
  markCell,
  parseStoredSession,
  pauseTimer,
  recordTieAnswer,
  resolveTieBreak,
  scoreFullCategory,
  setAnswer,
  startTieBreak,
  startTimer,
  winningLines,
  type BingoSession,
} from "./bingo-play";

const session = (level: "beginner" | "expert" = "beginner") =>
  createSession(level, ["Ada", "Bartek", "Celina"], "reproducible-game");
const checking = (
  category: number,
  level: "beginner" | "expert" = "beginner",
) => finishRound(drawRound(session(level), category));
const matchingCells = (game: BingoSession, player = 0) =>
  bingoBoard(game.players[player].seed, game.size).flatMap((category, index) =>
    category === game.round.category ? [index] : [],
  );

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}

function tiedGame(): BingoSession {
  let game = session();
  for (const player of game.players) {
    for (const index of [0, 1, 2, 3, 4])
      game = correctCell(game, player.id, index);
  }
  return game;
}

function ratedTie(correctIds: string[]): BingoSession {
  let game = finishRound(drawRound(startTieBreak(tiedGame()), 1));
  for (const id of game.tieBreak!.contenders)
    game = recordTieAnswer(game, id, correctIds.includes(id));
  return game;
}

describe("local Bingo session", () => {
  it("creates reproducible individual 5×5 boards and leaves the timer stopped", () => {
    const game = session();
    expect(game).toEqual(session());
    expect(game.players).toHaveLength(3);
    expect(new Set(game.players.map((player) => player.id)).size).toBe(3);
    expect(
      new Set(game.players.map((player) => bingoBoard(player.seed).join()))
        .size,
    ).toBe(3);
    expect(
      game.players.every(
        (player) => player.answer === "" && player.marks.length === 0,
      ),
    ).toBe(true);
    expect(game.activePlayerId).toBe(game.players[0].id);
    expect(game.round).toEqual({
      number: 0,
      category: null,
      phase: "ready",
      deadline: null,
      remainingMs: BINGO_ROUND_MS,
      scored: [],
      bonusUsed: [],
    });
  });

  it("supports one to twelve names and uses numeric fallbacks without translated copy", () => {
    expect(
      createSession("beginner", [], "seed").players.map(
        (player) => player.name,
      ),
    ).toEqual(["1", "2"]);
    expect(
      createSession("expert", ["  "], "seed").players.map(
        (player) => player.name,
      ),
    ).toEqual(["1"]);
    const game = createSession(
      "beginner",
      ["  Ada  ", "x".repeat(50), ...Array(20).fill("team")],
      "seed",
    );
    expect(game.players).toHaveLength(12);
    expect(game.players[0].name).toBe("Ada");
    expect(game.players[1].name).toHaveLength(40);
    expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
  });

  it("draws a new paused round, retaining marks while clearing answers, scoring and bonuses", () => {
    let game = checking(2);
    const [actor, target] = game.players;
    game = markCell(game, actor.id, matchingCells(game)[0]);
    game = correctCell(game, target.id, 0);
    game = eraseCell(game, actor.id, target.id, 0);
    const previousMarks = game.players[0].marks;
    game = drawRound(game, 4);
    game = setAnswer(game, actor.id, "1998");
    game = startTimer(game, 1000);
    const next = drawRound(freeze(game), 4);
    expect(next.round).toEqual({
      number: 3,
      category: 4,
      phase: "answering",
      deadline: null,
      remainingMs: BINGO_ROUND_MS,
      scored: [],
      bonusUsed: [],
    });
    expect(next.players.every((player) => player.answer === "")).toBe(true);
    expect(next.players[0].marks).toEqual(previousMarks);
    for (const category of [-1, 5, 0.5, NaN, Infinity])
      expect(drawRound(next, category)).toBe(next);
  });

  it("accepts answers only during answering and bounds pasted text", () => {
    const ready = session();
    const id = ready.players[0].id;
    expect(setAnswer(ready, id, "1984")).toBe(ready);
    let game = drawRound(ready, 1);
    expect(setAnswer(game, "missing", "answer")).toBe(game);
    expect(setAnswer(game, id, "")).toBe(game);
    game = setAnswer(freeze(game), id, "a".repeat(MAX_ANSWER_LENGTH + 20));
    expect(game.players[0].answer).toHaveLength(MAX_ANSWER_LENGTH);
    const checked = finishRound(game);
    expect(setAnswer(checked, id, "new answer")).toBe(checked);
  });
});

describe("round timer", () => {
  it("starts with the music, pauses and resumes the remaining time", () => {
    const ready = session();
    expect(startTimer(ready, 1000)).toBe(ready);
    let game = drawRound(ready, 0);
    expect(game.round.deadline).toBeNull();
    game = startTimer(freeze(game), 1000);
    expect(game.round.deadline).toBe(26_000);
    expect(startTimer(game, 2000)).toBe(game);
    expect(pauseTimer(game, 999)).toBe(game);
    game = pauseTimer(freeze(game), 6000);
    expect(game.round.deadline).toBeNull();
    expect(game.round.remainingMs).toBe(20_000);
    expect(pauseTimer(game, 7000)).toBe(game);
    game = startTimer(game, 10_000);
    expect(game.round.deadline).toBe(30_000);
    game = finishRound(freeze(game));
    expect(game.round.phase).toBe("checking");
    expect(game.round.deadline).toBeNull();
    expect(game.round.remainingMs).toBe(0);
    expect(finishRound(game)).toBe(game);
    expect(startTimer(game, 50_000)).toBe(game);
  });

  it("never grants extra time after expiry and rejects invalid timestamps", () => {
    let game = drawRound(session(), 0);
    for (const now of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])
      expect(startTimer(game, now)).toBe(game);
    game = startTimer(game, 1000);
    for (const now of [-1, NaN, Infinity])
      expect(pauseTimer(game, now)).toBe(game);
    game = pauseTimer(game, 100_000);
    expect(game.round.remainingMs).toBe(0);
    expect(startTimer(game, 200_000)).toBe(game);
  });
});

describe("marking and correcting boards", () => {
  it("awards one free cell of the drawn category per player and round", () => {
    let game = checking(3);
    const [first, second] = matchingCells(game);
    const id = game.players[0].id;
    const wrong = bingoBoard(game.players[0].seed).findIndex(
      (category) => category !== 3,
    );
    expect(markCell(game, id, wrong)).toBe(game);
    expect(markCell(game, "missing", first)).toBe(game);
    for (const index of [-1, 25, 1.1, NaN])
      expect(markCell(game, id, index)).toBe(game);
    const original = freeze(game);
    game = markCell(original, id, first);
    expect(original.players[0].marks).toEqual([]);
    expect(game.players[0].marks).toEqual([first]);
    expect(game.round.scored).toEqual([id]);
    expect(markCell(game, id, first)).toBe(game);
    expect(markCell(game, id, second)).toBe(game);
    game = finishRound(drawRound(game, 3));
    expect(markCell(game, id, first)).toBe(game);
    game = markCell(game, id, second);
    expect(game.players[0].marks).toEqual(
      [first, second].sort((a, b) => a - b),
    );
  });

  it("rejects scoring before checking and when no matching empty cells remain", () => {
    const ready = session();
    expect(markCell(ready, ready.players[0].id, 0)).toBe(ready);
    let game = drawRound(ready, 1);
    expect(markCell(game, game.players[0].id, matchingCells(game)[0])).toBe(
      game,
    );
    game = finishRound(game);
    for (const index of matchingCells(game))
      game = correctCell(game, game.players[0].id, index);
    for (const index of matchingCells(game))
      expect(markCell(game, game.players[0].id, index)).toBe(game);
    expect(game.round.scored).toEqual([]);
  });

  it("allows explicit corrections outside the category without consuming a point or bonus", () => {
    const game = freeze(session());
    const id = game.players[0].id;
    let corrected = correctCell(game, id, 24);
    corrected = correctCell(corrected, id, 0);
    expect(corrected.players[0].marks).toEqual([0, 24]);
    expect(corrected.round).toBe(game.round);
    corrected = correctCell(corrected, id, 24);
    expect(corrected.players[0].marks).toEqual([0]);
    expect(correctCell(corrected, "missing", 0)).toBe(corrected);
    expect(correctCell(corrected, id, 25)).toBe(corrected);
  });

  it("finds all complete rows, columns and diagonals without a free centre", () => {
    expect(winningLines([])).toEqual([]);
    expect(winningLines([0, 1, 2, 3])).toEqual([]);
    expect(winningLines([0, 6, 18, 24])).toEqual([]);
    expect(winningLines([0, 1, 2, 3, 4, 5, 10, 15, 20])).toEqual([
      [0, 1, 2, 3, 4],
      [0, 5, 10, 15, 20],
    ]);
    expect(winningLines([0, 6, 12, 18, 24, 4, 8, 16, 20])).toEqual([
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ]);
    expect(
      winningLines(Array.from({ length: 25 }, (_, index) => index)),
    ).toHaveLength(12);
    expect(winningLines([0, 1, 2, 3, 3])).toEqual([]);
  });
});

describe("beginner exact-year bonus", () => {
  it.each([2, 4])(
    "preserves the exact-year bonus when category %s is already full",
    (category) => {
      let game = checking(category);
      const [actor, target] = game.players;
      for (const index of matchingCells(game))
        game = correctCell(game, actor.id, index);
      game = correctCell(game, target.id, 0);
      game = correctCell(game, target.id, 1);
      const before = freeze(game);
      game = scoreFullCategory(before, actor.id);
      expect(game).not.toBe(before);
      expect(game.players).toBe(before.players);
      expect(game.players[0].marks).toEqual(matchingCells(game));
      expect(game.round.scored).toEqual([actor.id]);
      expect(scoreFullCategory(game, actor.id)).toBe(game);
      expect(before.round.scored).toEqual([]);
      expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
      game = eraseCell(game, actor.id, target.id, 0);
      expect(game.players[1].marks).toEqual([1]);
      expect(game.round.bonusUsed).toEqual([actor.id]);
      expect(eraseCell(game, actor.id, target.id, 1)).toBe(game);
    },
  );

  it("rejects full-category scoring for unfinished categories and outside normal checking", () => {
    let game = checking(2);
    const id = game.players[0].id;
    expect(scoreFullCategory(game, id)).toBe(game);
    const cells = matchingCells(game);
    for (const index of cells.slice(0, 4)) game = correctCell(game, id, index);
    expect(scoreFullCategory(game, id)).toBe(game);
    game = correctCell(game, id, cells[4]);
    expect(scoreFullCategory(game, "missing")).toBe(game);
    const answering = drawRound(game, 2);
    expect(scoreFullCategory(answering, id)).toBe(answering);
    const ready = session();
    expect(scoreFullCategory(ready, id)).toBe(ready);
    const tie = finishRound(drawRound(startTieBreak(tiedGame()), 2));
    expect(scoreFullCategory(tie, id)).toBe(tie);
    const won = resolveTieBreak(ratedTie([id]));
    expect(scoreFullCategory(won, id)).toBe(won);
  });

  it.each([2, 4])(
    "allows one opponent erasure after a point in category %s",
    (category) => {
      let game = checking(category);
      const [actor, target] = game.players;
      game = correctCell(game, target.id, 0);
      game = correctCell(game, target.id, 1);
      expect(eraseCell(game, actor.id, target.id, 0)).toBe(game);
      game = markCell(game, actor.id, matchingCells(game)[0]);
      expect(
        eraseCell(game, actor.id, actor.id, game.players[0].marks[0]),
      ).toBe(game);
      expect(eraseCell(game, actor.id, "missing", 0)).toBe(game);
      expect(eraseCell(game, actor.id, target.id, 2)).toBe(game);
      game = eraseCell(freeze(game), actor.id, target.id, 0);
      expect(game.players[1].marks).toEqual([1]);
      expect(game.round.bonusUsed).toEqual([actor.id]);
      expect(eraseCell(game, actor.id, target.id, 1)).toBe(game);
      game = finishRound(drawRound(game, category));
      game = markCell(
        game,
        actor.id,
        matchingCells(game).find(
          (index) => !game.players[0].marks.includes(index),
        )!,
      );
      expect(eraseCell(game, actor.id, target.id, 1).players[1].marks).toEqual(
        [],
      );
    },
  );

  it.each([
    ["expert", 2],
    ["expert", 4],
    ["beginner", 0],
    ["beginner", 1],
    ["beginner", 3],
  ] as const)(
    "does not grant an erasure for %s category %s",
    (level, category) => {
      let game = checking(category, level);
      const [actor, target] = game.players;
      game = markCell(game, actor.id, matchingCells(game)[0]);
      game = correctCell(game, target.id, 0);
      expect(eraseCell(game, actor.id, target.id, 0)).toBe(game);
    },
  );
});

describe("shared-device tie-break", () => {
  it("starts only with multiple completed boards and blocks regular board scoring", () => {
    let single = session();
    for (const index of [0, 1, 2, 3, 4])
      single = correctCell(single, "player-1", index);
    expect(startTieBreak(single)).toBe(single);
    let game = startTieBreak(freeze(tiedGame()));
    expect(game.tieBreak).toEqual({
      contenders: game.players.map((player) => player.id),
      correct: [],
    });
    expect(game.round.phase).toBe("ready");
    expect(startTieBreak(game)).toBe(game);
    game = finishRound(drawRound(game, 2));
    expect(markCell(game, game.players[0].id, matchingCells(game)[0])).toBe(
      game,
    );
    expect(eraseCell(game, game.players[0].id, game.players[1].id, 0)).toBe(
      game,
    );
  });

  it("waits for every contender rather than awarding victory to the first correct answer", () => {
    let game = finishRound(drawRound(startTieBreak(tiedGame()), 0));
    game = recordTieAnswer(freeze(game), "player-1", true);
    expect(game.tieBreak!.correct).toEqual(["player-1"]);
    expect(game.winnerId).toBeNull();
    expect(resolveTieBreak(game)).toBe(game);
    expect(recordTieAnswer(game, "player-1", false)).toBe(game);
    expect(recordTieAnswer(game, "missing", true)).toBe(game);
    game = recordTieAnswer(game, "player-2", false);
    game = recordTieAnswer(game, "player-3", false);
    game = resolveTieBreak(freeze(game));
    expect(game.winnerId).toBe("player-1");
    expect(game.tieBreak).toBeNull();
    expect(drawRound(game, 0)).toBe(game);
    expect(correctCell(game, "player-1", 0)).toBe(game);
    expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
  });

  it("keeps only successful contenders, or all when nobody succeeds, for the next question", () => {
    for (const correct of [["player-1", "player-3"], []]) {
      const previous = ratedTie(correct);
      let game = resolveTieBreak(freeze(previous));
      expect(game.winnerId).toBeNull();
      expect(game.tieBreak!.contenders).toEqual(
        correct.length ? correct : ["player-1", "player-2", "player-3"],
      );
      expect(game.tieBreak!.correct).toEqual([]);
      expect(game.round.scored).toEqual([]);
      expect(game.round.phase).toBe("ready");
      expect(game.round.number).toBe(previous.round.number);
      expect(recordTieAnswer(game, "player-1", true)).toBe(game);
      expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
      game = drawRound(game, 1);
      expect(game.round.number).toBe(previous.round.number + 1);
      expect(game.tieBreak!.correct).toEqual([]);
      expect(game.round.scored).toEqual([]);
      if (correct.length)
        expect(setAnswer(game, "player-2", "eliminated")).toBe(game);
    }
  });
});

describe("stored session validation", () => {
  it("round-trips ready, paused, running, checking and tie-break sessions", () => {
    const answering = setAnswer(drawRound(session(), 2), "player-1", "1984");
    const running = startTimer(answering, 1000);
    const checked = markCell(
      finishRound(answering),
      "player-1",
      matchingCells(answering)[0],
    );
    for (const game of [
      session(),
      answering,
      running,
      pauseTimer(running, 1100),
      checked,
      startTieBreak(tiedGame()),
      ratedTie(["player-1"]),
    ]) {
      const restored = parseStoredSession(JSON.stringify(game));
      expect(restored).toEqual(game);
      expect(restored).not.toBe(game);
      expect(restored!.players).not.toBe(game.players);
    }
  });

  it("rejects broken JSON and oversized input without throwing", () => {
    for (const raw of [
      null,
      "",
      "{",
      "null",
      "[]",
      '"text"',
      " ".repeat(32_769),
    ])
      expect(parseStoredSession(raw)).toBeNull();
  });

  it("rejects invalid schema, duplicate identities, broken references and impossible marks", () => {
    const mutations: ((game: any) => void)[] = [
      (game) => (game.version = 2),
      (game) => (game.level = "unknown"),
      (game) => (game.extra = true),
      (game) => delete game.round,
      (game) => (game.id = ""),
      (game) => (game.players = []),
      (game) => (game.players = Array(13).fill(game.players[0])),
      (game) => (game.players[1].id = game.players[0].id),
      (game) => (game.activePlayerId = "missing"),
      (game) => (game.players[0].name = "x".repeat(41)),
      (game) => (game.players[0].seed = "x".repeat(161)),
      (game) => (game.players[0].answer = "x".repeat(MAX_ANSWER_LENGTH + 1)),
      (game) => (game.players[0].marks = [0, 0]),
      (game) => (game.players[0].marks = [-1]),
      (game) => (game.players[0].marks = [25]),
      (game) => (game.players[0].marks = [1.5]),
      (game) => (game.players[0].marks = ["1"]),
    ];
    for (const mutate of mutations) {
      const game = structuredClone(session());
      mutate(game);
      expect(parseStoredSession(JSON.stringify(game))).toBeNull();
    }
  });

  it("rejects inconsistent timers, scoring and tie-break references", () => {
    const mutations: ((game: any) => void)[] = [
      (game) => (game.round.number = -1),
      (game) => (game.round.category = 5),
      (game) => (game.round.phase = "other"),
      (game) => (game.round.remainingMs = 25_001),
      (game) => (game.round.remainingMs = -1),
      (game) => (game.round.deadline = 20),
      (game) => (game.round.scored = ["player-1"]),
      (game) =>
        (game.tieBreak = { contenders: ["player-1", "missing"], correct: [] }),
      (game) => (game.winnerId = "missing"),
    ];
    for (const mutate of mutations) {
      const game = structuredClone(drawRound(session(), 0));
      mutate(game);
      expect(parseStoredSession(JSON.stringify(game))).toBeNull();
    }
    const checked = checking(0);
    expect(
      parseStoredSession(
        JSON.stringify({
          ...checked,
          round: { ...checked.round, deadline: 1000 },
        }),
      ),
    ).toBeNull();
    expect(
      parseStoredSession(
        JSON.stringify({
          ...checked,
          round: { ...checked.round, bonusUsed: ["player-1"] },
        }),
      ),
    ).toBeNull();
    const tie = ratedTie(["player-1"]);
    expect(
      parseStoredSession(
        JSON.stringify({
          ...tie,
          tieBreak: { ...tie.tieBreak, correct: ["player-1", "player-1"] },
        }),
      ),
    ).toBeNull();
    expect(
      parseStoredSession(
        JSON.stringify({
          ...tie,
          tieBreak: { ...tie.tieBreak, correct: ["missing"] },
        }),
      ),
    ).toBeNull();
  });
});

describe("different board sizes", () => {
  it.each([3, 4] as const)(
    "preserves size %s, marks, answers and timing through a saved round",
    (size) => {
      const initial = createSession("expert", ["Ada"], `sized-${size}`, size);
      const id = initial.players[0].id;
      expect(initial.size).toBe(size);
      let game = correctCell(initial, id, size * size - 1);
      game = setAnswer(drawRound(game, 0), id, "Saved answer");
      game = startTimer(game, 1000);
      const restored = parseStoredSession(JSON.stringify(game));
      expect(restored).toEqual(game);
      expect(restored!.players[0].marks).toEqual([size * size - 1]);
      expect(restored!.players[0].answer).toBe("Saved answer");
      expect(restored!.round.deadline).toBe(26_000);
      expect(parseStoredSession(JSON.stringify(finishRound(game)))).toEqual(
        finishRound(game),
      );
    },
  );

  it.each([3, 4] as const)(
    "marks and scores the actual category cells of size %s without requiring five cells",
    (size) => {
      const initial = createSession(
        "beginner",
        ["Ada", "Bartek"],
        `score-${size}`,
        size,
      );
      let game = finishRound(drawRound(initial, 2));
      const [actor, opponent] = game.players;
      const cells = matchingCells(game);
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThan(5);
      const wrong = bingoBoard(actor.seed, size).findIndex(
        (category) => category !== 2,
      );
      expect(markCell(game, actor.id, wrong)).toBe(game);
      game = markCell(game, actor.id, cells[0]);
      expect(game.players[0].marks).toEqual([cells[0]]);
      expect(game.round.scored).toEqual([actor.id]);
      expect(markCell(game, actor.id, cells.at(-1)!)).toBe(game);

      // A fresh round can acknowledge the correct answer after this small category fills.
      game = finishRound(drawRound(initial, 2));
      for (const cell of cells.slice(0, -1))
        game = correctCell(game, actor.id, cell);
      expect(scoreFullCategory(game, actor.id)).toBe(game);
      for (const cell of cells)
        if (!game.players[0].marks.includes(cell))
          game = correctCell(game, actor.id, cell);
      game = correctCell(game, opponent.id, size * size - 1);
      game = scoreFullCategory(game, actor.id);
      expect(game.round.scored).toEqual([actor.id]);
      game = eraseCell(game, actor.id, opponent.id, size * size - 1);
      expect(game.players[1].marks).toEqual([]);
      expect(game.round.bonusUsed).toEqual([actor.id]);
      expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
    },
  );

  it.each([3, 4] as const)(
    "rejects cells outside size %s in scoring, correction and stored marks",
    (size) => {
      const game = finishRound(
        drawRound(createSession("beginner", ["Ada"], "bounds", size), 0),
      );
      const id = game.players[0].id;
      for (const index of [-1, size * size, 24, 25, 1.5, NaN]) {
        expect(correctCell(game, id, index)).toBe(game);
        expect(markCell(game, id, index)).toBe(game);
      }
      for (const index of [size * size, 24]) {
        const invalid = structuredClone(game);
        invalid.players[0].marks = [index];
        expect(parseStoredSession(JSON.stringify(invalid))).toBeNull();
      }
    },
  );

  it("uses three cells per row, column or diagonal on a 3×3 board", () => {
    expect(winningLines([0, 1, 2], 3)).toEqual([[0, 1, 2]]);
    expect(winningLines([1, 4, 7], 3)).toEqual([[1, 4, 7]]);
    expect(winningLines([0, 4, 8], 3)).toEqual([[0, 4, 8]]);
    expect(winningLines([2, 4, 6], 3)).toEqual([[2, 4, 6]]);
    expect(winningLines([2, 3, 4], 3)).toEqual([]);
    expect(winningLines([0, 1, 1], 3)).toEqual([]);
    expect(winningLines([0, 6, 12, 18, 24], 3)).toEqual([]);
    expect(
      winningLines(
        Array.from({ length: 9 }, (_, index) => index),
        3,
      ),
    ).toHaveLength(8);
  });

  it("uses four cells per row, column or diagonal on a 4×4 board", () => {
    expect(winningLines([8, 9, 10, 11], 4)).toEqual([[8, 9, 10, 11]]);
    expect(winningLines([2, 6, 10, 14], 4)).toEqual([[2, 6, 10, 14]]);
    expect(winningLines([0, 5, 10, 15], 4)).toEqual([[0, 5, 10, 15]]);
    expect(winningLines([3, 6, 9, 12], 4)).toEqual([[3, 6, 9, 12]]);
    expect(winningLines([0, 5, 10, 14], 4)).toEqual([]);
    expect(winningLines([3, 4, 5, 6], 4)).toEqual([]);
    expect(winningLines([0, 6, 12, 18, 24], 4)).toEqual([]);
    expect(
      winningLines(
        Array.from({ length: 16 }, (_, index) => index),
        4,
      ),
    ).toHaveLength(10);
  });

  it.each([3, 4] as const)(
    "recognizes a shared-game tie from size-%s winning lines",
    (size) => {
      let game = createSession(
        "beginner",
        ["Ada", "Bartek"],
        "small-tie",
        size,
      );
      for (const player of game.players)
        for (let index = 0; index < size; index++)
          game = correctCell(game, player.id, index);
      game = startTieBreak(finishRound(drawRound(game, 0)));
      expect(game.tieBreak?.contenders).toEqual(
        game.players.map((player) => player.id),
      );
      expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
    },
  );

  it("restores legacy v1 saves without a size as 5×5 and rejects unknown keys", () => {
    const game = correctCell(session(), "player-1", 24);
    const { size: _size, ...legacy } = game;
    expect(parseStoredSession(JSON.stringify(legacy))).toEqual({
      ...game,
      size: 5,
    });
    expect(
      parseStoredSession(JSON.stringify({ ...legacy, unrelated: 3 })),
    ).toBeNull();
  });

  it("rejects unsupported sizes instead of changing the board silently", () => {
    for (const size of [0, 2, 6, 3.5, "3", null, [], {}]) {
      expect(
        parseStoredSession(JSON.stringify({ ...session(), size })),
      ).toBeNull();
    }
  });
});
