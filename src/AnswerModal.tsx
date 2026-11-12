import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Check, Eye, EyeOff, Pencil, ShieldCheck } from "lucide-react";
import { bingoCategories, bingoColors, type BingoLevel } from "./bingo";
import {
  answerKind,
  parseAnswer,
  serializeAnswer,
  type SavedAnswer,
} from "./answer";
import { useTranslation } from "./i18n";
import Modal from "./Modal";
import RoundStatus from "./RoundStatus";
import type { BingoRound } from "./bingo-play";
import "./answer-modal.css";

type Stage = "editing" | "covered" | "revealed";

export default function AnswerModal({
  level,
  answer,
  category,
  round,
  now,
  onSave,
  onClose,
}: {
  level: BingoLevel;
  answer: string;
  category: number | null;
  round: BingoRound;
  now: number;
  onSave: (answer: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<SavedAnswer | null>(() =>
    parseAnswer(answer, level),
  );
  const [stage, setStage] = useState<Stage>(() =>
    saved ? "covered" : "editing",
  );
  const [selected, setSelected] = useState<number | null>(
    () =>
      saved?.category ??
      (category !== null && category >= 0 && category < 5 ? category : null),
  );
  const [value, setValue] = useState(saved?.value ?? "");
  const [choosingType, setChoosingType] = useState(selected === null);
  const typesId = useId();
  const [error, setError] = useState("");
  const cover = useRef<HTMLButtonElement>(null);
  const revealed = useRef<HTMLHeadingElement>(null);
  const entry = useRef<HTMLDivElement>(null);
  const categories = useRef<HTMLFieldSetElement>(null);
  const year = new Date().getFullYear();
  const kind = selected === null ? null : answerKind(level, selected);
  const label = selected === null ? null : bingoCategories[level][selected];

  useEffect(() => {
    if (stage === "covered") cover.current?.focus();
    if (stage === "revealed") revealed.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (stage !== "editing") return;
    const target = choosingType
      ? (categories.current?.querySelector<HTMLElement>(
          "button[aria-pressed='true']",
        ) ?? categories.current?.querySelector<HTMLElement>("button"))
      : entry.current?.querySelector<HTMLElement>("input, select, button");
    target?.focus();
  }, [stage, selected, choosingType]);

  function displayAnswer(entry: SavedAnswer) {
    if (entry.category === null) return entry.value;
    const type = answerKind(level, entry.category);
    if (type === "artistType" || type === "before2000")
      return t(`answer.option.${entry.value}`);
    if (type === "decade")
      return t("answer.decade", {
        year: entry.value,
        end: Number(entry.value) + 9,
      });
    return entry.value;
  }

  function chooseCategory(index: number) {
    if (index !== selected) {
      setSelected(index);
      setValue("");
    }
    setChoosingType(false);
    setError("");
  }

  function save() {
    const encoded =
      selected === null ? null : serializeAnswer(level, selected, value);
    if (!encoded) {
      setError(t("answer.invalid"));
      return;
    }
    onSave(encoded);
    setSaved({ category: selected, value: value.trim() });
    setError("");
    setStage("covered");
  }

  const categoryChoices = (
    <fieldset ref={categories} className="answer-categories" id={typesId}>
      <legend>{t("answer.chooseType")}</legend>
      <div className="answer-category-grid">
        {bingoCategories[level].map((item, index) => (
          <button
            type="button"
            key={index}
            className="answer-category"
            aria-pressed={selected === index}
            style={
              {
                "--answer-fill": bingoColors[index].fill,
                "--answer-ink": bingoColors[index].ink,
              } as CSSProperties
            }
            onClick={() => chooseCategory(index)}
          >
            <span aria-hidden="true">{index + 1}</span>
            {item.name}
            {selected === index && <Check size={18} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Modal
      title={t("answer.title")}
      onClose={onClose}
      fullscreen
      context={
        round.category !== null ? (
          <RoundStatus level={level} round={round} now={now} />
        ) : undefined
      }
    >
      {stage === "editing" ? (
        <form
          className="answer-editor"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {selected === null && categoryChoices}
          {selected !== null && label && (
            <div
              className="answer-type-summary"
              style={
                {
                  "--answer-fill": bingoColors[selected].fill,
                  "--answer-ink": bingoColors[selected].ink,
                } as CSSProperties
              }
            >
              <strong>
                <span aria-hidden="true">{selected + 1}</span>
                {label.name}
              </strong>
              <button
                type="button"
                aria-expanded={choosingType}
                aria-controls={typesId}
                onClick={() => setChoosingType(!choosingType)}
              >
                {t(choosingType ? "answer.hideTypes" : "answer.changeType")}
              </button>
            </div>
          )}
          {kind && label && (
            <div ref={entry} className="answer-entry" key={selected}>
              {kind === "artistType" || kind === "before2000" ? (
                <div
                  className="answer-options"
                  role="group"
                  aria-label={label.name}
                >
                  {(kind === "artistType"
                    ? ["band", "solo"]
                    : ["yes", "no"]
                  ).map((option) => (
                    <button
                      type="button"
                      className="answer-option"
                      key={option}
                      aria-pressed={value === option}
                      onClick={() => {
                        setValue(option);
                        setError("");
                      }}
                    >
                      {t(`answer.option.${option}`)}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="answer-value-label">
                  <span>
                    {t(
                      kind === "decade"
                        ? "answer.decadeLabel"
                        : kind === "year"
                          ? "answer.yearLabel"
                          : "answer.valueLabel",
                    )}
                  </span>
                  {kind === "decade" ? (
                    <select
                      required
                      value={value}
                      onChange={(event) => {
                        setValue(event.target.value);
                        setError("");
                      }}
                    >
                      <option value="" disabled>
                        {t("answer.chooseDecade")}
                      </option>
                      {Array.from(
                        { length: Math.floor((year - 1900) / 10) + 1 },
                        (_, index) => 1900 + index * 10,
                      ).map((decade) => (
                        <option key={decade} value={decade}>
                          {t("answer.decade", {
                            year: decade,
                            end: decade + 9,
                          })}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={kind === "year" ? "number" : "text"}
                      inputMode={kind === "year" ? "numeric" : "text"}
                      min={kind === "year" ? 1900 : undefined}
                      max={kind === "year" ? year : undefined}
                      step={kind === "year" ? 1 : undefined}
                      maxLength={200}
                      required
                      autoComplete="off"
                      value={value}
                      placeholder={
                        kind === "year" ? "1984" : t("answer.textPlaceholder")
                      }
                      onChange={(event) => {
                        setValue(event.target.value);
                        setError("");
                      }}
                    />
                  )}
                </label>
              )}
              <p>{label.hint}</p>
            </div>
          )}
          {selected !== null && choosingType && categoryChoices}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="answer-editor-footer">
            <p>
              <EyeOff size={16} aria-hidden="true" />
              {t("answer.saveHint")}
            </p>
            <button
              type="submit"
              className="primary"
              disabled={selected === null || !value.trim()}
            >
              <Check size={19} aria-hidden="true" />
              {t("answer.save")}
            </button>
          </div>
        </form>
      ) : stage === "covered" ? (
        <div className="answer-covered-screen">
          <button
            ref={cover}
            type="button"
            className="answer-cover"
            onClick={() => setStage("revealed")}
          >
            <ShieldCheck size={64} strokeWidth={1.4} aria-hidden="true" />
            <strong>{t("answer.covered")}</strong>
            <span>{t("answer.revealHint")}</span>
            <span className="answer-cover-action">
              <Eye size={20} aria-hidden="true" />
              {t("answer.reveal")}
            </span>
          </button>
          <button
            type="button"
            className="answer-covered-new"
            onClick={() => {
              setValue("");
              setError("");
              setStage("editing");
            }}
          >
            <Pencil size={18} aria-hidden="true" />
            {t("answer.new")}
          </button>
        </div>
      ) : (
        <div className="answer-revealed-screen">
          {saved?.category !== null && saved && (
            <p className="answer-revealed-category">
              {bingoCategories[level][saved.category].name}
            </p>
          )}
          <h3 ref={revealed} tabIndex={-1} className="answer-revealed-value">
            {saved && displayAnswer(saved)}
          </h3>
          <div className="answer-revealed-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setStage("covered")}
            >
              <EyeOff size={18} aria-hidden="true" />
              {t("answer.hide")}
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                setError("");
                setStage("editing");
              }}
            >
              <Pencil size={18} aria-hidden="true" />
              {t("answer.edit")}
            </button>
            <button type="button" className="primary" onClick={onClose}>
              {t("app.close")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
