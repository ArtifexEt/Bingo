import { useEffect, useRef, useState } from "react";
import {
  Check,
  Eraser,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Shuffle,
  Trophy,
  Undo2,
  Users,
  X,
} from "lucide-react";
import {
  bingoBoard,
  bingoCategories,
  bingoColors,
  bingoLevels,
  randomBingoCategory,
  type BingoLevel,
} from "./bingo";
import { useTranslation, t } from "./i18n";
import BingoBoard from "./BingoBoard";
import Modal from "./Modal";
import {
  BINGO_ROUND_MS,
  createSession,
  correctCell,
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
import "./bingo-play.css";

const storageKey = (level: BingoLevel) => `bingo-game-${level}-v1`;
type View = "table" | "player";
function readGame(level: BingoLevel) {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(level));
  } catch {
    /* Saving is checked below. */
  }
  const saved = parseStoredSession(raw);
  return saved?.level === level
    ? saved
    : createSession(level, [t("play.defaultPlayer", { n: 1 })]);
}
function readView(): View {
  try {
    return localStorage.getItem("bingo-play-view") === "player"
      ? "player"
      : "table";
  } catch {
    return "table";
  }
}

export default function BingoPlay({
  level,
  onLevelChange,
  scannerUrl,
}: {
  level: BingoLevel;
  onLevelChange: (level: BingoLevel) => void;
  scannerUrl: string;
}) {
  const { t } = useTranslation();
  const [game, setGame] = useState(() => readGame(level));
  const [view, setView] = useState<View>(readView);
  const [now, setNow] = useState(Date.now);
  const [past, setPast] = useState<BingoSession[]>([]);
  const [correction, setCorrection] = useState(false);
  const [eraser, setEraser] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(true);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const deadline = game.round.deadline;
  const personal = view === "player";
  const visiblePlayers =
    game.tieBreak && !personal
      ? game.players.filter((p) => game.tieBreak!.contenders.includes(p.id))
      : game.players;
  const player =
    visiblePlayers.find((p) => p.id === game.activePlayerId) ??
    visiblePlayers[0];
  const categoryIndex = game.round.category;
  const category =
    categoryIndex === null ? null : bingoCategories[game.level][categoryIndex];
  const color = categoryIndex === null ? null : bingoColors[categoryIndex];
  const remaining =
    deadline === null ? game.round.remainingMs : Math.max(0, deadline - now);
  const seconds = Math.ceil(remaining / 1000);
  const winners = game.players.filter((p) => winningLines(p.marks).length > 0);
  const scored = game.round.scored.includes(player.id);
  const categoryFull =
    categoryIndex !== null &&
    bingoBoard(player.seed).every(
      (category, index) =>
        category !== categoryIndex || player.marks.includes(index),
    );
  const bonus =
    game.level === "beginner" &&
    (categoryIndex === 2 || categoryIndex === 4) &&
    scored &&
    !game.round.bonusUsed.includes(player.id) &&
    game.players.some((p) => p.id !== player.id && p.marks.length > 0) &&
    !game.tieBreak;

  useEffect(() => {
    if (game.level !== level) {
      setGame(readGame(level));
      setPast([]);
      setCorrection(false);
      setEraser(null);
      setError("");
    }
  }, [level, game.level]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(game.level), JSON.stringify(game));
      setSaving(true);
    } catch {
      setSaving(false);
    }
  }, [game]);
  useEffect(() => {
    try {
      localStorage.setItem("bingo-play-view", view);
    } catch {
      /* The view still works. */
    }
  }, [view]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) {
        setGame((current) =>
          current.round.deadline === deadline ? finishRound(current) : current,
        );
        if (sound && audio.current?.state === "running") {
          const context = audio.current;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0.12, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.5,
          );
          oscillator.start();
          oscillator.stop(context.currentTime + 0.5);
        }
      }
    };
    tick();
    const timer = window.setInterval(tick, 200);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, sound]);

  function apply(next: BingoSession, undoable = false) {
    if (next === game) return;
    if (undoable)
      setPast((history) => [...history.slice(-29), pausedSnapshot(game)]);
    setGame(
      next.tieBreak && !next.tieBreak.contenders.includes(next.activePlayerId)
        ? { ...next, activePlayerId: next.tieBreak.contenders[0] }
        : next,
    );
    setError("");
  }
  function undo() {
    const previous = past.at(-1);
    if (previous) {
      setGame(pausedSnapshot(previous));
      setPast(past.slice(0, -1));
      setEraser(null);
    }
  }
  function pausedSnapshot(current: BingoSession) {
    const paused = pauseTimer(current, Date.now());
    return paused.round.phase === "answering" && paused.round.remainingMs === 0
      ? finishRound(paused)
      : paused;
  }
  function draw() {
    try {
      apply(drawRound(game, randomBingoCategory()), true);
      setCorrection(false);
      setEraser(null);
      setConfirmDraw(false);
    } catch {
      setError(t("bingo.randomFailed"));
    }
  }
  function choosePlayer(id: string) {
    setGame((current) => ({ ...current, activePlayerId: id }));
  }
  function enableSound() {
    if (!sound) {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        setSound(true);
      } catch {
        setSound(false);
      }
    } else setSound(false);
  }
  function toggleTimer() {
    setNow(Date.now());
    apply(
      deadline === null
        ? startTimer(game, Date.now())
        : pauseTimer(game, Date.now()),
    );
    if (sound) void audio.current?.resume();
  }
  function clickCell(index: number) {
    if (personal || correction)
      apply(correctCell(game, player.id, index), true);
    else if (eraser) {
      const next = eraseCell(game, eraser, player.id, index);
      if (next !== game) {
        apply({ ...next, activePlayerId: eraser }, true);
        setEraser(null);
      }
    } else apply(markCell(game, player.id, index), true);
  }
  function cellEnabled(index: number) {
    if (game.winnerId) return false;
    if (personal || correction) return true;
    if (game.winnerId || game.tieBreak || game.round.phase !== "checking")
      return false;
    if (eraser) return player.id !== eraser && player.marks.includes(index);
    return (
      !scored &&
      !player.marks.includes(index) &&
      bingoBoard(player.seed)[index] === categoryIndex
    );
  }
  function openSetup() {
    setNames(game.players.map((p) => p.name));
    setSetup(true);
  }
  function newGame() {
    apply(createSession(level, names), true);
    setSetup(false);
    setCorrection(false);
    setEraser(null);
    setNow(Date.now());
  }
  const allTieAnswers = game.tieBreak?.contenders.every((id) =>
    game.round.scored.includes(id),
  );

  return (
    <div className="bingo-play">
      <div className="play-topbar">
        <div
          className="play-view-switch"
          role="group"
          aria-label={t("play.view")}
        >
          <button
            type="button"
            aria-pressed={!personal}
            onClick={() => {
              setView("table");
              setCorrection(false);
              setEraser(null);
            }}
          >
            <Users size={17} aria-hidden="true" />
            {t("play.tableView")}
          </button>
          <button
            type="button"
            aria-pressed={personal}
            onClick={() => {
              setView("player");
              setCorrection(false);
              setEraser(null);
            }}
          >
            {t("play.playerView")}
          </button>
        </div>
        <button className="quiet play-new-game" onClick={openSetup}>
          <RotateCcw size={17} aria-hidden="true" />
          {t("play.newGame")}
        </button>
      </div>
      <fieldset className="bingo-level play-level">
        <legend className="sr-only">
          {t("components.BingoGame.questionLevel")}
        </legend>
        {Object.entries(bingoLevels).map(([value, name]) => (
          <label className="bingo-level-option" key={value}>
            <input
              type="radio"
              name="bingo-level"
              checked={level === value}
              onChange={() => onLevelChange(value as BingoLevel)}
            />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      {!saving && (
        <p className="error" role="alert">
          {t("play.saveFailed")}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className={`play-layout${personal ? " is-personal" : ""}`}>
        {!personal && (
          <section className="play-round" aria-label={t("play.roundPanel")}>
            <div
              className="play-question"
              style={
                color ? { background: color.fill, color: color.ink } : undefined
              }
            >
              <span className="play-round-label">
                {game.tieBreak
                  ? t("play.tieBreak")
                  : t("play.round", { n: game.round.number || 1 })}
                {categoryIndex !== null && (
                  <span> · {t("play.category", { n: categoryIndex + 1 })}</span>
                )}
              </span>
              <h2>{category?.name ?? t("bingoApp.emptyQuestion")}</h2>
              {category && <p>{category.hint}</p>}
              {game.tieBreak && (
                <p>
                  {t("play.tieContenders", {
                    names: game.players
                      .filter((p) => game.tieBreak!.contenders.includes(p.id))
                      .map((p) => p.name)
                      .join(", "),
                  })}
                </p>
              )}
            </div>
            {category && !game.winnerId && (
              <div className="play-timer-panel">
                <div
                  className={`play-clock${seconds <= 5 ? " is-ending" : ""}`}
                  role="timer"
                  aria-label={t("play.secondsLeft", { seconds })}
                  aria-live="off"
                >
                  <span>{seconds.toString().padStart(2, "0")}</span>
                  <small>{t("play.seconds")}</small>
                </div>
                <div className="play-timer-actions">
                  {game.round.phase === "answering" ? (
                    <>
                      <button className="secondary" onClick={toggleTimer}>
                        {deadline === null ? (
                          <Play size={17} aria-hidden="true" />
                        ) : (
                          <Pause size={17} aria-hidden="true" />
                        )}
                        {deadline !== null
                          ? t("play.pause")
                          : remaining < BINGO_ROUND_MS
                            ? t("play.resume")
                            : t("play.startTimer")}
                      </button>
                      <button
                        className="quiet"
                        onClick={() => apply(finishRound(game))}
                      >
                        {t("play.checkAnswers")}
                      </button>
                    </>
                  ) : (
                    <p className="play-checking" role="status">
                      {t("play.checking")}
                    </p>
                  )}
                </div>
                <label className="play-sound">
                  <input
                    type="checkbox"
                    checked={sound}
                    onChange={enableSound}
                  />
                  {t("play.sound")}
                </label>
              </div>
            )}
            {!game.winnerId && (
              <button
                className="primary play-draw"
                disabled={
                  deadline !== null ||
                  Boolean(game.tieBreak && game.round.phase === "checking")
                }
                onClick={() =>
                  game.round.phase === "answering"
                    ? setConfirmDraw(true)
                    : draw()
                }
              >
                <Shuffle size={19} aria-hidden="true" />
                {category
                  ? t("play.nextRound")
                  : t("components.BingoGame.drawAChallenge")}
              </button>
            )}
            <a
              className="bingo-scanner-link"
              href={scannerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ScanLine size={18} aria-hidden="true" />
              {t("bingoApp.scanCard")}
            </a>
          </section>
        )}
        <section className="play-board-panel" aria-label={t("play.boards")}>
          <div className="play-player-tools">
            <label className="play-player-select">
              <span>{t("play.player")}</span>
              <select
                value={player.id}
                onChange={(event) => choosePlayer(event.target.value)}
              >
                {visiblePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {!personal && game.round.scored.includes(p.id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button className="quiet" disabled={!past.length} onClick={undo}>
              <Undo2 size={18} aria-hidden="true" />
              {t("play.undo")}
            </button>
          </div>
          {eraser && (
            <div className="play-mode-note" role="status">
              <Eraser size={18} aria-hidden="true" />
              <span>
                {t("play.eraseInstruction", {
                  name: game.players.find((p) => p.id === eraser)?.name ?? "",
                })}
              </span>
              <button
                className="quiet"
                aria-label={t("shell.cancel")}
                onClick={() => {
                  choosePlayer(eraser);
                  setEraser(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <BingoBoard
            player={player}
            level={game.level}
            mode={
              personal || correction ? "correct" : eraser ? "erase" : "mark"
            }
            activeCategory={personal ? null : categoryIndex}
            enabled={cellEnabled}
            onCell={clickCell}
          />
          <div className="play-board-footer">
            {personal ? (
              <p>
                {t(game.winnerId ? "play.gameFinished" : "play.personalHint")}
              </p>
            ) : (
              <>
                <p role="status">
                  {game.winnerId
                    ? t("play.gameFinished")
                    : game.tieBreak
                      ? t("play.tieAnswerHint")
                      : correction
                        ? t("play.correctionHint")
                        : scored
                          ? t("play.pointRecorded")
                          : categoryFull && game.round.phase === "checking"
                            ? t("play.categoryFullHint")
                            : game.round.phase === "checking"
                              ? t("play.markHint")
                              : t("play.listenHint")}
                </p>
                <button
                  className="quiet"
                  disabled={Boolean(game.winnerId)}
                  aria-pressed={correction}
                  onClick={() => {
                    setCorrection(!correction);
                    setEraser(null);
                  }}
                >
                  <Eraser size={16} aria-hidden="true" />
                  {t("play.correction")}
                </button>
              </>
            )}
          </div>
          {!eraser && (
            <label className="play-answer">
              <span>{t("play.answer")}</span>
              <input
                type="text"
                maxLength={240}
                value={player.answer}
                disabled={
                  Boolean(game.winnerId) ||
                  (!personal && game.round.phase !== "answering")
                }
                placeholder={t("play.answerPlaceholder")}
                onChange={(event) =>
                  personal
                    ? apply({
                        ...game,
                        players: game.players.map((p) =>
                          p.id === player.id
                            ? { ...p, answer: event.target.value }
                            : p,
                        ),
                      })
                    : apply(setAnswer(game, player.id, event.target.value))
                }
              />
            </label>
          )}
          {!personal &&
            !game.tieBreak &&
            !game.winnerId &&
            !scored &&
            categoryFull &&
            game.round.phase === "checking" && (
              <button
                className="secondary play-bonus"
                onClick={() => apply(scoreFullCategory(game, player.id), true)}
              >
                <Check size={18} aria-hidden="true" />
                {t("play.scoreFullCategory")}
              </button>
            )}
          {!personal && bonus && !correction && !game.winnerId && !eraser && (
            <button
              className="secondary play-bonus"
              onClick={() => {
                setEraser(player.id);
                const opponent = game.players.find(
                  (p) => p.id !== player.id && p.marks.length,
                );
                if (opponent) choosePlayer(opponent.id);
              }}
            >
              <Eraser size={18} aria-hidden="true" />
              {t("play.exactYearBonus")}
            </button>
          )}
          {!personal &&
            game.tieBreak &&
            game.round.phase === "checking" &&
            game.tieBreak.contenders.includes(player.id) &&
            !scored && (
              <div className="play-tie-actions">
                <button
                  className="primary"
                  onClick={() =>
                    apply(recordTieAnswer(game, player.id, true), true)
                  }
                >
                  <Check size={18} />
                  {t("play.correctAnswer")}
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    apply(recordTieAnswer(game, player.id, false), true)
                  }
                >
                  <X size={18} />
                  {t("play.wrongAnswer")}
                </button>
              </div>
            )}
          {!personal && game.tieBreak && game.round.phase === "checking" && (
            <button
              className="secondary play-resolve"
              disabled={!allTieAnswers}
              onClick={() => apply(resolveTieBreak(game), true)}
            >
              {t("play.resolveTie")}
            </button>
          )}
          {!personal &&
            !game.tieBreak &&
            (winners.length > 0 || game.winnerId) && (
              <div className="play-winner" role="status">
                <Trophy size={25} aria-hidden="true" />
                <div>
                  <strong>
                    {game.winnerId
                      ? t("play.winner", {
                          name:
                            game.players.find((p) => p.id === game.winnerId)
                              ?.name ?? "",
                        })
                      : t("play.bingoPlayers", {
                          names: winners.map((p) => p.name).join(", "),
                        })}
                  </strong>
                  {!game.winnerId && <p>{t("play.settleRound")}</p>}
                </div>
                {!game.winnerId && (
                  <button
                    className="secondary"
                    disabled={game.round.phase !== "checking"}
                    onClick={() =>
                      winners.length > 1
                        ? apply(startTieBreak(game), true)
                        : apply(
                            {
                              ...game,
                              winnerId: winners[0].id,
                              round: {
                                ...game.round,
                                scored: [
                                  ...new Set([
                                    ...game.round.scored,
                                    winners[0].id,
                                  ]),
                                ],
                              },
                            },
                            true,
                          )
                    }
                  >
                    {winners.length > 1
                      ? t("play.startTie")
                      : t("play.confirmWinner")}
                  </button>
                )}
              </div>
            )}
        </section>
      </div>
      {setup && (
        <Modal title={t("play.newGame")} onClose={() => setSetup(false)} sheet>
          <form
            className="play-setup"
            onSubmit={(event) => {
              event.preventDefault();
              newGame();
            }}
          >
            <label>
              {t("play.playerCount")}
              <select
                value={names.length}
                onChange={(event) =>
                  setNames(
                    Array.from(
                      { length: Number(event.target.value) },
                      (_, i) =>
                        names[i] ?? t("play.defaultPlayer", { n: i + 1 }),
                    ),
                  )
                }
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className="play-names">
              {names.map((name, index) => (
                <label key={index}>
                  {t("play.playerNumber", { n: index + 1 })}
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(event) =>
                      setNames(
                        names.map((current, i) =>
                          i === index ? event.target.value : current,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p>{t("play.localGame")}</p>
            {(game.round.number > 0 ||
              game.players.some((p) => p.marks.length)) && (
              <p className="play-reset-note">{t("play.resetWarning")}</p>
            )}
            <div className="play-setup-actions">
              <button className="primary" type="submit">
                {t("play.startGame")}
              </button>
              <button
                className="quiet"
                type="button"
                onClick={() => setSetup(false)}
              >
                {t("shell.cancel")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDraw && (
        <Modal
          title={t("play.nextRound")}
          onClose={() => setConfirmDraw(false)}
          sheet
        >
          <p>{t("play.replaceRound")}</p>
          <div className="play-setup-actions">
            <button className="primary" onClick={draw}>
              {t("play.nextRound")}
            </button>
            <button className="quiet" onClick={() => setConfirmDraw(false)}>
              {t("shell.cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
