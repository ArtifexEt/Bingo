import { bingoBoard, type BingoLevel } from "./bingo";

export const BINGO_ROUND_MS = 25_000;
export const MAX_BINGO_PLAYERS = 12;
export const MAX_PLAYER_NAME_LENGTH = 40;
export const MAX_ANSWER_LENGTH = 240;
const MAX_STORED_LENGTH = 32_768;
const MAX_SEED_LENGTH = 160;

export interface BingoPlayer {
  id: string;
  name: string;
  seed: string;
  marks: number[];
  answer: string;
}

export interface BingoRound {
  number: number;
  category: number | null;
  phase: "ready" | "answering" | "checking";
  deadline: number | null;
  remainingMs: number;
  scored: string[];
  bonusUsed: string[];
}

export interface BingoSession {
  version: 1;
  id: string;
  level: BingoLevel;
  players: BingoPlayer[];
  activePlayerId: string;
  round: BingoRound;
  tieBreak: { contenders: string[]; correct: string[] } | null;
  winnerId: string | null;
}

const isCell = (value: number) =>
  Number.isInteger(value) && value >= 0 && value < 25;
const isCategory = (value: number) =>
  Number.isInteger(value) && value >= 0 && value < 5;
const isTime = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isBonusCategory = (session: BingoSession) =>
  session.level === "beginner" &&
  (session.round.category === 2 || session.round.category === 4);

function readyRound(number: number): BingoRound {
  return {
    number,
    category: null,
    phase: "ready",
    deadline: null,
    remainingMs: BINGO_ROUND_MS,
    scored: [],
    bonusUsed: [],
  };
}

function generatedSeed(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

function sessionId(seed: string): string {
  let hash = 2166136261;
  for (const character of seed)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return `bingo-${hash.toString(36)}`;
}

/** Seeded boards and identifiers are stable; display names contain no translated copy. */
export function createSession(
  level: BingoLevel,
  names: string[],
  seed?: string,
): BingoSession {
  if (level !== "beginner" && level !== "expert")
    throw new Error("Invalid Bingo level");
  const baseSeed =
    (seed ?? generatedSeed())
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .trim()
      .slice(0, 128) || generatedSeed();
  const entries = names.length ? names.slice(0, MAX_BINGO_PLAYERS) : ["1", "2"];
  const players = entries.map(
    (name, index): BingoPlayer => ({
      id: `player-${index + 1}`,
      name:
        name
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .trim()
          .slice(0, MAX_PLAYER_NAME_LENGTH) || String(index + 1),
      seed: `${baseSeed}:${index + 1}`,
      marks: [],
      answer: "",
    }),
  );
  return {
    version: 1,
    id: sessionId(baseSeed),
    level,
    players,
    activePlayerId: players[0].id,
    round: readyRound(0),
    tieBreak: null,
    winnerId: null,
  };
}

/** Drawing is an explicit new round, including when the host replaces an unfinished one. */
export function drawRound(
  session: BingoSession,
  category: number,
): BingoSession {
  if (
    session.winnerId ||
    !isCategory(category) ||
    session.round.number >= Number.MAX_SAFE_INTEGER
  )
    return session;
  return {
    ...session,
    players: session.players.map((player) =>
      player.answer === "" ? player : { ...player, answer: "" },
    ),
    round: {
      ...readyRound(session.round.number + 1),
      category,
      phase: "answering",
    },
    tieBreak: session.tieBreak ? { ...session.tieBreak, correct: [] } : null,
  };
}

export function startTimer(session: BingoSession, now: number): BingoSession {
  const round = session.round;
  if (
    session.winnerId ||
    round.phase !== "answering" ||
    round.deadline !== null ||
    round.remainingMs <= 0 ||
    !isTime(now) ||
    !Number.isSafeInteger(now + round.remainingMs)
  )
    return session;
  return { ...session, round: { ...round, deadline: now + round.remainingMs } };
}

export function pauseTimer(session: BingoSession, now: number): BingoSession {
  const round = session.round;
  if (
    session.winnerId ||
    round.phase !== "answering" ||
    round.deadline === null ||
    !isTime(now) ||
    now < round.deadline - round.remainingMs
  )
    return session;
  return {
    ...session,
    round: {
      ...round,
      deadline: null,
      remainingMs: Math.max(0, round.deadline - now),
    },
  };
}

export function finishRound(session: BingoSession): BingoSession {
  if (session.winnerId || session.round.phase !== "answering") return session;
  return {
    ...session,
    round: {
      ...session.round,
      phase: "checking",
      deadline: null,
      remainingMs: 0,
    },
  };
}

export function setAnswer(
  session: BingoSession,
  playerId: string,
  answer: string,
): BingoSession {
  if (
    session.winnerId ||
    session.round.phase !== "answering" ||
    typeof answer !== "string" ||
    (session.tieBreak && !session.tieBreak.contenders.includes(playerId))
  )
    return session;
  const player = session.players.find((entry) => entry.id === playerId);
  const value = answer
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, MAX_ANSWER_LENGTH);
  if (!player || player.answer === value) return session;
  return {
    ...session,
    players: session.players.map((entry) =>
      entry === player ? { ...entry, answer: value } : entry,
    ),
  };
}

export function markCell(
  session: BingoSession,
  playerId: string,
  index: number,
): BingoSession {
  if (
    session.winnerId ||
    session.tieBreak ||
    session.round.phase !== "checking" ||
    !isCell(index) ||
    session.round.scored.includes(playerId)
  )
    return session;
  const player = session.players.find((entry) => entry.id === playerId);
  if (
    !player ||
    player.marks.includes(index) ||
    bingoBoard(player.seed)[index] !== session.round.category
  )
    return session;
  return {
    ...session,
    players: session.players.map((entry) =>
      entry === player
        ? { ...entry, marks: [...entry.marks, index].sort((a, b) => a - b) }
        : entry,
    ),
    round: { ...session.round, scored: [...session.round.scored, playerId] },
  };
}

/** A verified answer still counts when its category has no empty cells left. */
export function scoreFullCategory(
  session: BingoSession,
  playerId: string,
): BingoSession {
  const { round } = session;
  if (
    session.winnerId ||
    session.tieBreak ||
    round.phase !== "checking" ||
    round.category === null ||
    !isCategory(round.category) ||
    round.scored.includes(playerId)
  )
    return session;
  const player = session.players.find((entry) => entry.id === playerId);
  if (!player) return session;
  const cells = bingoBoard(player.seed).flatMap((category, index) =>
    category === round.category ? [index] : [],
  );
  if (
    cells.length !== 5 ||
    !cells.every((index) => player.marks.includes(index))
  )
    return session;
  return {
    ...session,
    round: { ...round, scored: [...round.scored, playerId] },
  };
}

/** The host grants this bonus after verifying the exact year; the model does not grade music. */
export function eraseCell(
  session: BingoSession,
  actorId: string,
  targetId: string,
  index: number,
): BingoSession {
  if (
    session.winnerId ||
    session.tieBreak ||
    session.round.phase !== "checking" ||
    !isBonusCategory(session) ||
    !session.round.scored.includes(actorId) ||
    session.round.bonusUsed.includes(actorId) ||
    actorId === targetId ||
    !isCell(index)
  )
    return session;
  const target = session.players.find((entry) => entry.id === targetId);
  if (!target || !target.marks.includes(index)) return session;
  return {
    ...session,
    players: session.players.map((entry) =>
      entry === target
        ? { ...entry, marks: entry.marks.filter((mark) => mark !== index) }
        : entry,
    ),
    round: {
      ...session.round,
      bonusUsed: [...session.round.bonusUsed, actorId],
    },
  };
}

/** Explicit host correction toggles any cell without consuming a round's point or bonus. */
export function correctCell(
  session: BingoSession,
  playerId: string,
  index: number,
): BingoSession {
  if (session.winnerId || !isCell(index)) return session;
  const player = session.players.find((entry) => entry.id === playerId);
  if (!player) return session;
  const marks = player.marks.includes(index)
    ? player.marks.filter((mark) => mark !== index)
    : [...player.marks, index].sort((a, b) => a - b);
  return {
    ...session,
    players: session.players.map((entry) =>
      entry === player ? { ...entry, marks } : entry,
    ),
  };
}

export function winningLines(marks: number[]): number[][] {
  const selected = new Set(marks.filter(isCell));
  const lines: number[][] = [];
  for (let row = 0; row < 5; row++)
    lines.push(Array.from({ length: 5 }, (_, column) => row * 5 + column));
  for (let column = 0; column < 5; column++)
    lines.push(Array.from({ length: 5 }, (_, row) => row * 5 + column));
  lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return lines.filter((line) => line.every((index) => selected.has(index)));
}

export function startTieBreak(session: BingoSession): BingoSession {
  if (session.winnerId || session.tieBreak) return session;
  const contenders = session.players
    .filter((player) => winningLines(player.marks).length > 0)
    .map((player) => player.id);
  if (contenders.length < 2) return session;
  return {
    ...session,
    round: readyRound(session.round.number),
    tieBreak: { contenders, correct: [] },
  };
}

export function recordTieAnswer(
  session: BingoSession,
  playerId: string,
  correct: boolean,
): BingoSession {
  if (
    session.winnerId ||
    !session.tieBreak ||
    session.round.phase !== "checking" ||
    typeof correct !== "boolean" ||
    !session.tieBreak.contenders.includes(playerId) ||
    session.round.scored.includes(playerId)
  )
    return session;
  return {
    ...session,
    round: { ...session.round, scored: [...session.round.scored, playerId] },
    tieBreak: {
      ...session.tieBreak,
      correct: correct
        ? [...session.tieBreak.correct, playerId]
        : session.tieBreak.correct,
    },
  };
}

export function resolveTieBreak(session: BingoSession): BingoSession {
  const tie = session.tieBreak;
  if (
    session.winnerId ||
    !tie ||
    session.round.phase !== "checking" ||
    !tie.contenders.every((id) => session.round.scored.includes(id))
  )
    return session;
  if (tie.correct.length === 1)
    return { ...session, tieBreak: null, winnerId: tie.correct[0] };
  return {
    ...session,
    round: readyRound(session.round.number),
    tieBreak: {
      contenders: tie.correct.length > 1 ? [...tie.correct] : tie.contenders,
      correct: [],
    },
  };
}

function record(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function text(
  value: unknown,
  maxLength: number,
  empty = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (empty || value.trim().length > 0) &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}

function uniqueIds(value: unknown, ids: Set<string>): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= ids.size &&
    new Set(value).size === value.length &&
    value.every((id) => typeof id === "string" && ids.has(id))
  );
}

/** Stored state is untrusted. Reject malformed or internally inconsistent sessions atomically. */
export function parseStoredSession(raw: string | null): BingoSession | null {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > MAX_STORED_LENGTH
  )
    return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !record(value, [
        "version",
        "id",
        "level",
        "players",
        "activePlayerId",
        "round",
        "tieBreak",
        "winnerId",
      ]) ||
      value.version !== 1 ||
      !text(value.id, 160) ||
      (value.level !== "beginner" && value.level !== "expert") ||
      !Array.isArray(value.players) ||
      value.players.length < 1 ||
      value.players.length > MAX_BINGO_PLAYERS
    )
      return null;
    const players: BingoPlayer[] = [];
    for (const player of value.players) {
      if (
        !record(player, ["id", "name", "seed", "marks", "answer"]) ||
        !text(player.id, 80) ||
        !text(player.name, MAX_PLAYER_NAME_LENGTH) ||
        /[\r\n\t]/.test(player.name) ||
        !text(player.seed, MAX_SEED_LENGTH) ||
        !text(player.answer, MAX_ANSWER_LENGTH, true) ||
        !Array.isArray(player.marks) ||
        player.marks.length > 25 ||
        new Set(player.marks).size !== player.marks.length ||
        !player.marks.every((mark) => typeof mark === "number" && isCell(mark))
      )
        return null;
      players.push({
        id: player.id,
        name: player.name,
        seed: player.seed,
        marks: [...player.marks],
        answer: player.answer,
      });
    }
    const ids = new Set(players.map((player) => player.id));
    if (
      ids.size !== players.length ||
      typeof value.activePlayerId !== "string" ||
      !ids.has(value.activePlayerId)
    )
      return null;
    const round = value.round;
    if (
      !record(round, [
        "number",
        "category",
        "phase",
        "deadline",
        "remainingMs",
        "scored",
        "bonusUsed",
      ]) ||
      typeof round.number !== "number" ||
      !isTime(round.number) ||
      (round.category !== null &&
        (typeof round.category !== "number" || !isCategory(round.category))) ||
      (round.phase !== "ready" &&
        round.phase !== "answering" &&
        round.phase !== "checking") ||
      typeof round.remainingMs !== "number" ||
      !Number.isInteger(round.remainingMs) ||
      round.remainingMs < 0 ||
      round.remainingMs > BINGO_ROUND_MS ||
      (round.deadline !== null &&
        (typeof round.deadline !== "number" || !isTime(round.deadline))) ||
      !uniqueIds(round.scored, ids) ||
      !uniqueIds(round.bonusUsed, ids)
    )
      return null;
    const scored = round.scored;
    if (!round.bonusUsed.every((id) => scored.includes(id))) return null;
    if (round.phase === "ready") {
      if (
        round.category !== null ||
        round.deadline !== null ||
        round.remainingMs !== BINGO_ROUND_MS ||
        round.scored.length ||
        round.bonusUsed.length
      )
        return null;
    } else if (round.category === null || round.number < 1) return null;
    if (
      round.phase === "answering" &&
      (round.scored.length ||
        round.bonusUsed.length ||
        (round.deadline !== null &&
          (round.remainingMs === 0 || round.deadline < round.remainingMs)))
    )
      return null;
    if (
      round.phase === "checking" &&
      (round.deadline !== null || round.remainingMs !== 0)
    )
      return null;
    if (
      round.bonusUsed.length &&
      (value.level !== "beginner" ||
        (round.category !== 2 && round.category !== 4))
    )
      return null;
    let tieBreak: BingoSession["tieBreak"] = null;
    if (value.tieBreak !== null) {
      const tie = value.tieBreak;
      if (
        !record(tie, ["contenders", "correct"]) ||
        !uniqueIds(tie.contenders, ids) ||
        tie.contenders.length < 2 ||
        !uniqueIds(tie.correct, new Set(tie.contenders))
      )
        return null;
      const contenders = tie.contenders;
      if (
        round.bonusUsed.length ||
        !scored.every((id) => contenders.includes(id)) ||
        !tie.correct.every((id) => scored.includes(id)) ||
        (round.phase !== "checking" && tie.correct.length)
      )
        return null;
      tieBreak = { contenders: [...tie.contenders], correct: [...tie.correct] };
    }
    if (round.phase === "ready" && !tieBreak && round.number !== 0) return null;
    if (
      value.winnerId !== null &&
      (typeof value.winnerId !== "string" ||
        !ids.has(value.winnerId) ||
        tieBreak !== null ||
        round.phase !== "checking" ||
        !round.scored.includes(value.winnerId))
    )
      return null;
    return {
      version: 1,
      id: value.id,
      level: value.level,
      players,
      activePlayerId: value.activePlayerId,
      round: {
        number: round.number,
        category: round.category,
        phase: round.phase,
        deadline: round.deadline,
        remainingMs: round.remainingMs,
        scored: [...round.scored],
        bonusUsed: [...round.bonusUsed],
      },
      tieBreak,
      winnerId: value.winnerId,
    };
  } catch {
    return null;
  }
}
