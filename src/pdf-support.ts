import { t } from "./i18n";

let fontPromise: Promise<string> | undefined;

/** Shared embedded font; a failed request may be retried by the next export. */
export function pdfFont() {
  return (fontPromise ??= fetch(
    `${import.meta.env.BASE_URL}fonts/NotoSans-Regular.ttf`,
  )
    .then((response) => {
      if (!response.ok) throw new Error(t("pdf.fontFailed"));
      return response.arrayBuffer();
    })
    .then((buffer) => {
      let binary = "";
      for (const value of new Uint8Array(buffer))
        binary += String.fromCharCode(value);
      return btoa(binary);
    })
    .catch((error) => {
      fontPromise = undefined;
      throw error;
    }));
}

export type PDFProgress = {
  completed: number;
  total: number;
  percent: number;
};

export const yieldForPDF = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
