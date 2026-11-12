import { describe, expect, it } from "vitest";
import {
  BINGO_ROUND_MS,
  correctCell,
  createSession,
  drawRound,
  finishRound,
  parseStoredSession,
  pauseTimer,
  recordTieAnswer,
  resolveTieBreak,
  startTieBreak,
  startTimer,
  type BingoSession,
} from "./bingo-play";
import { personalSession } from "./bingo-personal";

function sharedSession(): BingoSession {
  return createSession("beginner", ["Ada", "Bartek"], "migration-test");
}

function tiedSession(): BingoSession {
  let game = sharedSession();
  for (const player of game.players)
    for (const cell of [0, 1, 2, 3, 4])
      game = correctCell(game, player.id, cell);
  return startTieBreak(finishRound(drawRound(game, 2)));
}

function expectRestorable(game: BingoSession) {
  expect(parseStoredSession(JSON.stringify(game))).toEqual(game);
  expect(personalSession(game)).toEqual(game);
}

describe("personal Bingo session migration", () => {
  it("keeps the selected board, marks and answer without changing the saved game", () => {
    const previous = sharedSession();
    previous.activePlayerId = previous.players[1].id;
    previous.players[1].marks = [2, 8, 14];
    previous.players[1].answer = "1984";
    const snapshot = structuredClone(previous);

    const game = personalSession(previous);

    expect(game.id).toBe(previous.id);
    expect(game.level).toBe(previous.level);
    expect(game.players).toEqual([previous.players[1]]);
    expect(game.activePlayerId).toBe(previous.players[1].id);
    expect(previous).toEqual(snapshot);
    expectRestorable(game);
  });

  it("falls back to the first board when the active player is absent", () => {
    const previous = sharedSession();
    previous.activePlayerId = "missing";
    const game = personalSession(previous);
    expect(game.players).toEqual([previous.players[0]]);
    expect(game.activePlayerId).toBe(previous.players[0].id);
    expectRestorable(game);
  });

  it("keeps ready, running and paused round timers", () => {
    const ready = sharedSession();
    const running = startTimer(drawRound(ready, 1), 1000);
    const paused = pauseTimer(running, 6000);
    for (const previous of [ready, running, paused]) {
      const game = personalSession(previous);
      expect(game.round).toEqual(previous.round);
      expectRestorable(game);
    }
  });

  it("removes opponent scoring and erasure bonuses", () => {
    const previous = finishRound(drawRound(sharedSession(), 2));
    previous.activePlayerId = previous.players[1].id;
    previous.round.scored = previous.players.map((player) => player.id);
    previous.round.bonusUsed = [...previous.round.scored];
    const game = personalSession(previous);
    expect(game.round.scored).toEqual([previous.activePlayerId]);
    expect(game.round.bonusUsed).toEqual([]);
    expectRestorable(game);
  });

  it("reopens a completed board so its marks can be corrected", () => {
    const previous = finishRound(drawRound(sharedSession(), 0));
    previous.players[0].marks = [0, 1, 2, 3, 4];
    previous.winnerId = previous.players[0].id;
    previous.round.scored = [previous.winnerId];
    const game = personalSession(previous);
    expect(game.winnerId).toBeNull();
    expect(correctCell(game, game.activePlayerId, 0).players[0].marks).toEqual([
      1, 2, 3, 4,
    ]);
    expectRestorable(game);
  });

  it("converts a ready tie-break into a legal initial round", () => {
    const previous = tiedSession();
    expect(previous.round.number).toBeGreaterThan(0);
    const game = personalSession(previous);
    expect(game.players[0].marks).toEqual([0, 1, 2, 3, 4]);
    expect(game.tieBreak).toBeNull();
    expect(game.round).toEqual({
      number: 0,
      category: null,
      phase: "ready",
      deadline: null,
      remainingMs: BINGO_ROUND_MS,
      scored: [],
      bonusUsed: [],
    });
    expectRestorable(game);
  });

  it("retains timing in an active tie-break and restores a resolved tie-break", () => {
    const running = startTimer(drawRound(tiedSession(), 1), 1000);
    const rated = finishRound(running);
    const winner = rated.players[1].id;
    let complete = rated;
    for (const player of rated.players)
      complete = recordTieAnswer(complete, player.id, player.id === winner);
    complete = resolveTieBreak(complete);
    complete.activePlayerId = winner;

    for (const previous of [running, rated, complete]) {
      const game = personalSession(previous);
      expect(game.tieBreak).toBeNull();
      expect(game.winnerId).toBeNull();
      expect(game.round.deadline).toBe(previous.round.deadline);
      expect(game.round.remainingMs).toBe(previous.round.remainingMs);
      expectRestorable(game);
    }
  });
});
