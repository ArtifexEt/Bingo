import type { BingoSession } from "./bingo-play";

/** Keep the selected board when upgrading a shared-device game to personal play. */
export function personalSession(session: BingoSession): BingoSession {
  const player =
    session.players.find((entry) => entry.id === session.activePlayerId) ??
    session.players[0];
  if (!player) throw new Error("A personal Bingo session needs a board");

  // A ready round numbered above zero is only valid while a tie-break exists.
  const round =
    session.round.phase === "ready" && session.round.number > 0
      ? {
          number: 0,
          category: null,
          phase: "ready" as const,
          deadline: null,
          remainingMs: session.roundDurationMs,
          scored: [],
          bonusUsed: [],
        }
      : {
          ...session.round,
          scored: session.round.scored.filter((id) => id === player.id),
          bonusUsed: [],
        };

  return {
    ...session,
    players: [player],
    activePlayerId: player.id,
    round,
    tieBreak: null,
    winnerId: null,
  };
}
