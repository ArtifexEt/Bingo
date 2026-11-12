import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, ScanLine, Shuffle, Undo2 } from "lucide-react";
import {
  bingoCategories,
  bingoColors,
  bingoLevels,
  randomBingoCategory,
  type BingoLevel,
  type BingoSize,
} from "./bingo";
import { useTranslation } from "./i18n";
import BingoBoard from "./BingoBoard";
import BingoCelebration from "./BingoCelebration";
import AnswerModal from "./AnswerModal";
import BoardSizeSelect from "./BoardSizeSelect";
import Modal from "./Modal";
import {
  BINGO_ROUND_MS,
  correctCell,
  createSession,
  drawRound,
  finishRound,
  parseStoredSession,
  pauseTimer,
  startTimer,
  winningLines,
  type BingoSession,
} from "./bingo-play";
import { personalSession } from "./bingo-personal";
import "./bingo-play.css";

const storageKey = (level: BingoLevel) => `bingo-game-${level}-v2`;
function readGame(level: BingoLevel) {
  // Keep the size-aware save separate so an older open tab cannot overwrite it.
  for (const key of [storageKey(level), `bingo-game-${level}-v1`]) {
    try {
      const saved = parseStoredSession(localStorage.getItem(key));
      if (saved?.level === level) return personalSession(saved);
    } catch {
      /* Saving is checked below. */
    }
  }
  return createSession(level, ["1"]);
}

export default function BingoPlay({
  level,
  onLevelChange,
  onBoardSizeChange,
  scannerUrl,
}: {
  level: BingoLevel;
  onLevelChange: (level: BingoLevel) => void;
  onBoardSizeChange: (size: BingoSize) => void;
  scannerUrl: string;
}) {
  const { t } = useTranslation();
  const [game, setGame] = useState(() => readGame(level));
  const [now, setNow] = useState(Date.now);
  const [past, setPast] = useState<BingoSession[]>([]);
  const [setup, setSetup] = useState(false);
  const [setupSize, setSetupSize] = useState<BingoSize>(game.size);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(true);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [sound, setSound] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);
  const celebrationCount = useRef(0);
  const finishCelebration = useCallback(() => setCelebration(null), []);
  const audio = useRef<AudioContext | null>(null);
  const player = game.players[0];
  const deadline = game.round.deadline;
  const categoryIndex = game.round.category;
  const category =
    categoryIndex === null ? null : bingoCategories[game.level][categoryIndex];
  const color = categoryIndex === null ? null : bingoColors[categoryIndex];
  const remaining =
    deadline === null ? game.round.remainingMs : Math.max(0, deadline - now);
  const seconds = Math.ceil(remaining / 1000);

  useEffect(() => {
    onBoardSizeChange(game.size);
  }, [game.size, onBoardSizeChange]);

  useEffect(() => {
    if (game.level !== level) {
      setGame(readGame(level));
      setPast([]);
      setCelebration(null);
      setSetup(false);
      setAnswerOpen(false);
      setConfirmDraw(false);
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
    const hasBingo = winningLines(next.players[0].marks, next.size).length > 0;
    if (next.id !== game.id || !hasBingo) setCelebration(null);
    else if (!winningLines(player.marks, game.size).length)
      setCelebration(++celebrationCount.current);
    setGame(next);
    setError("");
  }
  function pausedSnapshot(current: BingoSession) {
    const paused = pauseTimer(current, Date.now());
    return paused.round.phase === "answering" && paused.round.remainingMs === 0
      ? finishRound(paused)
      : paused;
  }
  function undo() {
    const previous = past.at(-1);
    if (previous) {
      setGame(pausedSnapshot(previous));
      setPast(past.slice(0, -1));
      setCelebration(null);
    }
  }
  function draw() {
    try {
      apply(drawRound(game, randomBingoCategory()), true);
      setConfirmDraw(false);
    } catch {
      setError(t("bingo.randomFailed"));
    }
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
  function enableSound() {
    if (sound) setSound(false);
    else {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        setSound(true);
      } catch {
        setSound(false);
      }
    }
  }

  return (
    <div className="bingo-play">
      {celebration !== null && (
        <BingoCelebration key={celebration} onComplete={finishCelebration} />
      )}
      <div className="play-topbar">
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
        <div className="play-board-tools">
          <button className="quiet" disabled={!past.length} onClick={undo}>
            <Undo2 size={17} aria-hidden="true" />
            {t("play.undo")}
          </button>
          <button
            className="quiet play-new-game"
            onClick={() => {
              setSetupSize(game.size);
              setSetup(true);
            }}
          >
            <RotateCcw size={17} aria-hidden="true" />
            {t("play.newGame")}
          </button>
        </div>
      </div>
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
      <section className="play-board-panel" aria-label={t("board.title")}>
        <BingoBoard
          board={player}
          level={game.level}
          size={game.size}
          onCell={(index) => apply(correctCell(game, player.id, index), true)}
        />
        <div className="play-board-footer">
          <p>{t("play.personalHint")}</p>
        </div>
        <button
          className="primary play-answer-button"
          aria-haspopup="dialog"
          onClick={() => setAnswerOpen(true)}
        >
          {t(player.answer ? "play.savedAnswer" : "play.answer")}
        </button>
      </section>
      <details className="play-host">
        <summary>{t("play.roundPanel")}</summary>
        <p className="play-host-hint">{t("play.hostHint")}</p>
        <section className="play-round" aria-label={t("play.roundPanel")}>
          <div
            className="play-question"
            style={
              color ? { background: color.fill, color: color.ink } : undefined
            }
          >
            <span className="play-round-label">
              {t("play.round", { n: game.round.number || 1 })}
              {categoryIndex !== null &&
                ` · ${t("play.category", { n: categoryIndex + 1 })}`}
            </span>
            <h2>{category?.name ?? t("bingoApp.emptyQuestion")}</h2>
            {category && <p>{category.hint}</p>}
          </div>
          {category && (
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
                <input type="checkbox" checked={sound} onChange={enableSound} />
                {t("play.sound")}
              </label>
            </div>
          )}
          <button
            className="primary play-draw"
            disabled={deadline !== null}
            onClick={() =>
              game.round.phase === "answering" ? setConfirmDraw(true) : draw()
            }
          >
            <Shuffle size={19} aria-hidden="true" />
            {category
              ? t("play.nextRound")
              : t("components.BingoGame.drawAChallenge")}
          </button>
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
      </details>
      {answerOpen && (
        <AnswerModal
          level={game.level}
          answer={player.answer}
          category={categoryIndex}
          onSave={(answer) =>
            apply({ ...game, players: [{ ...player, answer }] })
          }
          onClose={() => setAnswerOpen(false)}
        />
      )}
      {setup && (
        <Modal title={t("play.newGame")} onClose={() => setSetup(false)} sheet>
          <p>{t("play.resetWarning")}</p>
          <div className="play-size-field">
            <BoardSizeSelect value={setupSize} onChange={setSetupSize} />
          </div>
          <div className="play-setup-actions">
            <button
              className="primary"
              onClick={() => {
                apply(createSession(level, ["1"], undefined, setupSize));
                setPast([]);
                setSetup(false);
                setNow(Date.now());
              }}
            >
              {t("play.startGame")}
            </button>
            <button className="quiet" onClick={() => setSetup(false)}>
              {t("shell.cancel")}
            </button>
          </div>
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
