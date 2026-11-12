import { createTranslator, getLanguage } from "./i18n";
import type { PDFProgress } from "./pdf-support";

/** Reserve the viewer in the click handler, before asynchronous PDF generation. */
export function preparePDFPreview(onCancel: () => void) {
  const translate = createTranslator();
  const language = getLanguage();
  let page: Window | null = null;
  try {
    page = window.open("about:blank", "_blank");
    if (!page) return null;
    page.opener = null;
    const doc = page.document;
    doc.title = translate("pdf.previewTitle");
    doc.documentElement.lang = language;
    doc.body.style.cssText =
      "margin:0;padding:48px 24px;background:#f6f5f1;color:#183c33;font:16px/1.7 system-ui,sans-serif;";
    const main = doc.createElement("main");
    main.style.cssText = "max-width:520px;margin:8vh auto;";
    const brand = doc.createElement("p");
    brand.textContent = "Bingo";
    const title = doc.createElement("h1");
    title.textContent = translate("pdf.preparingCards");
    title.style.cssText = "font:normal 32px/1.25 Georgia,serif;";
    const hint = doc.createElement("p");
    hint.textContent = translate("pdf.printHint");
    const progress = doc.createElement("progress");
    progress.max = 100;
    progress.value = 0;
    progress.setAttribute("aria-label", translate("pdf.printPreparation"));
    progress.style.cssText = "width:100%;accent-color:#183c33;";
    const status = doc.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = translate("pdf.preparingFile");
    const cancel = doc.createElement("button");
    cancel.textContent = translate("pdf.cancelPreparation");
    cancel.style.cssText =
      "padding:12px 18px;min-height:44px;border:1px solid #b6bfae;border-radius:8px;background:white;color:#183c33;cursor:pointer;font:inherit;";
    cancel.onclick = onCancel;
    main.append(brand, title, hint, progress, status, cancel);
    doc.body.append(main);
    const viewer = page;
    let url: string | undefined;
    let cleanupTimer: number | undefined;
    const release = () => {
      window.clearInterval(cleanupTimer);
      if (url) URL.revokeObjectURL(url);
      url = undefined;
    };
    return {
      update(next: PDFProgress) {
        if (viewer.closed) {
          onCancel();
          return;
        }
        progress.value = next.percent;
        status.textContent = translate("pdf.completedCards", {
          completed: next.completed,
          total: next.total,
          percent: next.percent,
        });
      },
      show(blob: Blob) {
        if (viewer.closed) throw new Error(translate("pdf.previewClosed"));
        url = URL.createObjectURL(blob);
        viewer.location.replace(url);
        cleanupTimer = window.setInterval(() => {
          if (viewer.closed) release();
        }, 30000);
      },
      close() {
        release();
        if (!viewer.closed) viewer.close();
      },
    };
  } catch {
    page?.close();
    return null;
  }
}
