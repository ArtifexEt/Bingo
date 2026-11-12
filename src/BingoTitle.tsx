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
      </span>
    </h1>
  );
}
