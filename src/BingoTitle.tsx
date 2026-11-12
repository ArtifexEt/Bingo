import type { CSSProperties } from "react";
import { bingoColors } from "./bingo";
import { useTranslation } from "./i18n";
import "./bingo-title.css";

const turns = ["-6deg", "3deg", "-3deg", "5deg", "-4deg"];

export default function BingoTitle() {
  const { t } = useTranslation();
  const title = t("components.BingoGame.musicBingo");

  return (
    <h1 id="bingo-title" className="bingo-title" aria-label={title}>
      <span className="bingo-title-letters" aria-hidden="true">
        {Array.from(title).map((letter, index) => (
          <span
            className="bingo-title-tile"
            key={index}
            style={
              {
                "--title-fill": bingoColors[index % bingoColors.length].fill,
                "--title-turn": turns[index % turns.length],
                "--title-delay": `${index * 50}ms`,
              } as CSSProperties
            }
          >
            {letter}
          </span>
        ))}
        <svg className="bingo-title-music" viewBox="0 0 18 18" fill="none">
          <path
            d="M4 8v4M9 4v10M14 6v6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </h1>
  );
}
