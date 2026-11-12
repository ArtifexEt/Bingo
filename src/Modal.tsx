import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "./i18n";
import "./modal.css";

type ScrollLock = { count: number; overflow: string; paddingRight: string };
const scrollLocks = new WeakMap<Document, ScrollLock>();

function lockPage(document: Document) {
  const existing = scrollLocks.get(document);
  if (existing) existing.count++;
  else {
    const body = document.body;
    scrollLocks.set(document, {
      count: 1,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    });
    const view = document.defaultView;
    const scrollbar = view
      ? view.innerWidth - document.documentElement.clientWidth
      : 0;
    if (view && scrollbar > 0)
      body.style.paddingRight = `${parseFloat(view.getComputedStyle(body).paddingRight) + scrollbar}px`;
    body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const lock = scrollLocks.get(document);
    if (!lock || --lock.count > 0) return;
    document.body.style.overflow = lock.overflow;
    document.body.style.paddingRight = lock.paddingRight;
    scrollLocks.delete(document);
  };
}

export default function Modal({
  title,
  children,
  onClose,
  wide = false,
  sheet = false,
  fullscreen = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  sheet?: boolean;
  fullscreen?: boolean;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const startedOnBackdrop = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const document = dialog.ownerDocument;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const releaseScroll = lockPage(document);
    const viewport = document.defaultView?.visualViewport;
    const updateViewport = () => {
      dialog.style.setProperty(
        "--dialog-viewport-height",
        `${viewport?.height || window.innerHeight}px`,
      );
      dialog.style.setProperty(
        "--dialog-viewport-top",
        `${viewport?.offsetTop || 0}px`,
      );
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    if (!dialog.open) dialog.showModal();
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      if (dialog.open) dialog.close();
      releaseScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const isBackdrop = (event: { clientX: number; clientY: number }) => {
    const bounds = ref.current?.getBoundingClientRect();
    return Boolean(
      bounds &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom),
    );
  };

  return (
    <dialog
      ref={ref}
      className={
        "modal app-modal" +
        (wide ? " wide" : "") +
        (sheet ? " bottom-sheet" : "") +
        (fullscreen ? " fullscreen" : "")
      }
      aria-labelledby={headingId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        startedOnBackdrop.current =
          event.target === event.currentTarget && isBackdrop(event);
      }}
      onClick={(event) => {
        if (
          startedOnBackdrop.current &&
          event.target === event.currentTarget &&
          isBackdrop(event)
        )
          onClose();
        startedOnBackdrop.current = false;
      }}
    >
      <div className="modal-heading">
        <h2 id={headingId}>{title}</h2>
        <button
          className="icon modal-close"
          type="button"
          aria-label={t("app.close")}
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
