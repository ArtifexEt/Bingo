import { bingoSizes, isBingoSize, type BingoSize } from "./bingo";
import { useTranslation } from "./i18n";

export default function BoardSizeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: BingoSize;
  onChange: (size: BingoSize) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <label className="board-size-select">
      <span>{t("board.size")}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const size = Number(event.target.value);
          if (isBingoSize(size)) onChange(size);
        }}
      >
        {bingoSizes.map((size) => (
          <option key={size} value={size}>
            {t("board.sizeOption", { size, total: size * size })}
          </option>
        ))}
      </select>
    </label>
  );
}
