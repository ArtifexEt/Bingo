import { registerSW } from "virtual:pwa-register";

export type InstallOutcome = "accepted" | "dismissed";
type InstallChoice = { outcome: InstallOutcome };
export type InstallPromptEvent = Event & {
  prompt: () => Promise<InstallChoice | void>;
  userChoice?: Promise<InstallChoice>;
};
export type PwaSnapshot = {
  installed: boolean;
  canPrompt: boolean;
  manualInstall: boolean;
  online: boolean;
  offlineReady: boolean;
  canUpdate: boolean;
  updateReady: boolean;
  updating: boolean;
  updateError: boolean;
  checking: boolean;
  checked: boolean;
  checkError: boolean;
};

const initial: PwaSnapshot = {
  installed: false,
  canPrompt: false,
  manualInstall: false,
  online: true,
  offlineReady: false,
  canUpdate: false,
  updateReady: false,
  updating: false,
  updateError: false,
  checking: false,
  checked: false,
  checkError: false,
};
export const appVersion = (import.meta.env.VITE_APP_VERSION || "dev").slice(
  0,
  7,
);
const listeners = new Set<() => void>();
let snapshot = initial;
let installPrompt: InstallPromptEvent | null = null;
let installed = false;
let registration: ServiceWorkerRegistration | undefined;
let initialized = false;
let cleanup: (() => void) | undefined;
let activateUpdate: (() => Promise<void>) | undefined;
let checkPromise: Promise<void> | undefined;
let manualCheck = false;
let lastCheck = -Infinity;
let approvedUpdate = false;
let reloadAvailable = false;
let reloading = false;
let applyTimeout: ReturnType<typeof setTimeout> | undefined;

export function supportsManualInstall({
  userAgent = "",
  platform = "",
  maxTouchPoints = 0,
}: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}) {
  const appleMobile =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  return (
    appleMobile &&
    /Safari\//.test(userAgent) &&
    !/FBAN|FBAV|Instagram|Line\/|MicroMessenger|GSA\//.test(userAgent)
  );
}

function publish(changes: Partial<PwaSnapshot> = {}) {
  const standalone =
    typeof window !== "undefined" &&
    Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: minimal-ui)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone,
    );
  const isInstalled = installed || standalone;
  const next = {
    ...snapshot,
    ...changes,
    installed: isInstalled,
    canPrompt: !isInstalled && Boolean(installPrompt),
    manualInstall:
      !isInstalled &&
      typeof navigator !== "undefined" &&
      supportsManualInstall(navigator),
    online: typeof navigator === "undefined" || navigator.onLine !== false,
  };
  if (
    Object.keys(next).every(
      (key) =>
        next[key as keyof PwaSnapshot] === snapshot[key as keyof PwaSnapshot],
    )
  )
    return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export const getPwaSnapshot = () => snapshot;
export const getServerPwaSnapshot = () => initial;
export function subscribePwa(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Browser installation prompts are single-use and only opened by a user click. */
export async function requestAppInstall(): Promise<InstallOutcome | null> {
  const event = installPrompt;
  if (!event || snapshot.installed) return null;
  installPrompt = null;
  publish();
  const result = await event.prompt();
  return (result || (await event.userChoice))?.outcome ?? null;
}

export function checkForUpdates(manual = false): Promise<void> {
  if (checkPromise) {
    if (manual) manualCheck = true;
    return checkPromise;
  }
  if (
    typeof navigator === "undefined" ||
    navigator.onLine === false ||
    (!manual && document.visibilityState !== "visible")
  )
    return Promise.resolve();
  if (!registration) {
    if (manual) publish({ checkError: true });
    return Promise.resolve();
  }
  if (!manual && Date.now() - lastCheck < 60_000) return Promise.resolve();
  lastCheck = Date.now();
  manualCheck = manual;
  publish({ checking: true, checked: false, checkError: false });
  checkPromise = Promise.resolve()
    .then(() => registration!.update())
    .then(() => {
      publish({
        checked: manualCheck,
        updateReady: snapshot.updateReady || Boolean(registration?.waiting),
      });
    })
    .catch(() => {
      if (manualCheck) publish({ checkError: true });
    })
    .finally(() => {
      checkPromise = undefined;
      manualCheck = false;
      publish({ checking: false });
    });
  return checkPromise;
}

function reload() {
  if (reloading) return;
  reloading = true;
  clearTimeout(applyTimeout);
  window.location.reload();
}

/** A waiting worker cannot activate or reload this screen before an explicit click. */
export async function applyAppUpdate() {
  if (!snapshot.updateReady || snapshot.updating) return;
  approvedUpdate = true;
  publish({ updating: true, updateError: false });
  if (reloadAvailable) {
    reload();
    return;
  }
  const failed = () => {
    approvedUpdate = false;
    clearTimeout(applyTimeout);
    publish({ updating: false, updateError: true });
  };
  applyTimeout = setTimeout(failed, 15_000);
  try {
    if (!activateUpdate) throw new Error("No registered update");
    await activateUpdate();
  } catch {
    failed();
  }
}

/** Start before React so installation and update events are captured during loading. */
export function initializePwa() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const onPrompt = (event: Event) => {
    if (typeof (event as InstallPromptEvent).prompt !== "function") return;
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    publish();
  };
  const onInstalled = () => {
    installed = true;
    installPrompt = null;
    publish();
  };
  const onConnection = () => {
    publish();
    void checkForUpdates();
  };
  const onFocus = () => {
    void checkForUpdates();
  };
  const modes = ["standalone", "minimal-ui"].map((mode) =>
    window.matchMedia?.(`(display-mode: ${mode})`),
  );
  const displayChanged = () => publish();
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  window.addEventListener("online", onConnection);
  window.addEventListener("offline", onConnection);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
  modes.forEach((mode) => mode?.addEventListener?.("change", displayChanged));
  let hadController = Boolean(navigator.serviceWorker?.controller);
  const controlled = () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    reloadAvailable = true;
    if (approvedUpdate) reload();
    else publish({ updateReady: true, updating: false });
  };
  navigator.serviceWorker?.addEventListener("controllerchange", controlled);
  const interval = window.setInterval(onFocus, 10 * 60_000);
  publish({ canUpdate: "serviceWorker" in navigator });
  activateUpdate = registerSW({
    immediate: true,
    onNeedRefresh: () => publish({ updateReady: true }),
    onNeedReload: () => {
      reloadAvailable = true;
      if (approvedUpdate) reload();
      else publish({ updateReady: true });
    },
    onOfflineReady: () => publish({ offlineReady: true }),
    onRegisteredSW(_url, value) {
      registration = value;
      publish({
        canUpdate: Boolean(value),
        offlineReady: Boolean(value?.active),
        updateReady: snapshot.updateReady || Boolean(value?.waiting),
      });
      void checkForUpdates();
    },
    onRegisterError: () => publish({ canUpdate: false }),
  });
  cleanup = () => {
    clearTimeout(applyTimeout);
    window.clearInterval(interval);
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    window.removeEventListener("online", onConnection);
    window.removeEventListener("offline", onConnection);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    modes.forEach((mode) =>
      mode?.removeEventListener?.("change", displayChanged),
    );
    navigator.serviceWorker?.removeEventListener(
      "controllerchange",
      controlled,
    );
  };
}

import.meta.hot?.dispose(() => cleanup?.());
