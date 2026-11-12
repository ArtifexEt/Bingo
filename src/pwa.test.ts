import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterSWOptions } from "vite-plugin-pwa/types";

const mocks = vi.hoisted(() => ({
  options: undefined as RegisterSWOptions | undefined,
  activate: vi.fn<() => Promise<void>>(),
}));
vi.mock("virtual:pwa-register", () => ({
  registerSW: (options: RegisterSWOptions) => {
    mocks.options = options;
    return mocks.activate;
  },
}));

const iphone =
  "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
let browser: EventTarget;
let page: EventTarget & { visibilityState: string };
let worker: EventTarget & { controller: object | null };
let nav: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  onLine: boolean;
  serviceWorker: typeof worker;
};
let standalone: boolean;
let reload: ReturnType<typeof vi.fn>;
let registration: {
  update: ReturnType<typeof vi.fn>;
  waiting: object | null;
  active: object | null;
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  mocks.options = undefined;
  mocks.activate.mockReset().mockResolvedValue(undefined);
  standalone = false;
  reload = vi.fn();
  worker = Object.assign(new EventTarget(), {
    controller: {} as object | null,
  });
  nav = {
    userAgent: "",
    platform: "",
    maxTouchPoints: 0,
    onLine: true,
    serviceWorker: worker,
  };
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  browser = Object.assign(new EventTarget(), {
    location: { reload },
    matchMedia: (query: string) =>
      Object.assign(new EventTarget(), {
        matches: query.includes("standalone") && standalone,
      }),
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  });
  registration = {
    update: vi.fn(async () => undefined),
    waiting: null,
    active: {},
  };
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", nav);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function start(registered = true) {
  const api = await import("./pwa");
  api.initializePwa();
  if (registered) {
    mocks.options!.onRegisteredSW!(
      "/Bingo/sw.js",
      registration as unknown as ServiceWorkerRegistration,
    );
    await api.checkForUpdates();
  }
  return api;
}
function installEvent(
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" } | void>,
) {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
  });
}

describe("PWA installation", () => {
  it("offers manual instructions only on Apple mobile browsers with a share menu", async () => {
    const { supportsManualInstall } = await import("./pwa");
    expect(supportsManualInstall({ userAgent: iphone })).toBe(true);
    expect(
      supportsManualInstall({
        userAgent: "Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(supportsManualInstall({ userAgent: iphone + " Instagram" })).toBe(
      false,
    );
    expect(
      supportsManualInstall({ userAgent: "Android Chrome/130 Safari/537.36" }),
    ).toBe(false);
    expect(
      supportsManualInstall({
        userAgent: "Safari/605.1.15",
        platform: "MacIntel",
      }),
    ).toBe(false);
  });

  it("captures a single-use prompt without opening it until the user asks", async () => {
    const api = await start();
    const prompt = vi.fn(async () => ({ outcome: "accepted" as const }));
    const event = installEvent(prompt);
    browser.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(api.getPwaSnapshot().canPrompt).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    await expect(api.requestAppInstall()).resolves.toBe("accepted");
    await expect(api.requestAppInstall()).resolves.toBeNull();
    expect(prompt).toHaveBeenCalledOnce();
    browser.dispatchEvent(new Event("appinstalled"));
    expect(api.getPwaSnapshot()).toMatchObject({
      installed: true,
      canPrompt: false,
      manualInstall: false,
    });
  });

  it("handles dismissal, older userChoice results and failed prompts without reusing an event", async () => {
    const api = await start();
    browser.dispatchEvent(
      Object.assign(
        installEvent(async () => {}),
        { userChoice: Promise.resolve({ outcome: "dismissed" }) },
      ),
    );
    await expect(api.requestAppInstall()).resolves.toBe("dismissed");
    browser.dispatchEvent(
      installEvent(async () => {
        throw new Error("No prompt");
      }),
    );
    await expect(api.requestAppInstall()).rejects.toThrow("No prompt");
    expect(api.getPwaSnapshot().canPrompt).toBe(false);
    browser.dispatchEvent(installEvent(async () => ({ outcome: "accepted" })));
    await expect(api.requestAppInstall()).resolves.toBe("accepted");
  });

  it("hides installation controls in standalone mode and reports connectivity separately", async () => {
    standalone = true;
    nav.userAgent = iphone;
    const api = await start();
    const prompt = vi.fn(async () => ({ outcome: "accepted" as const }));
    browser.dispatchEvent(installEvent(prompt));
    await expect(api.requestAppInstall()).resolves.toBeNull();
    expect(prompt).not.toHaveBeenCalled();
    nav.onLine = false;
    browser.dispatchEvent(new Event("offline"));
    expect(api.getPwaSnapshot()).toMatchObject({
      installed: true,
      canPrompt: false,
      manualInstall: false,
      online: false,
    });
  });
});

describe("deliberate PWA updates", () => {
  it("waits for user approval before activating and reloading an available update", async () => {
    const api = await start();
    mocks.options!.onNeedRefresh!();
    expect(api.getPwaSnapshot().updateReady).toBe(true);
    expect(mocks.activate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    await api.applyAppUpdate();
    await api.applyAppUpdate();
    expect(mocks.activate).toHaveBeenCalledOnce();
    expect(api.getPwaSnapshot().updating).toBe(true);
    mocks.options!.onNeedReload!();
    worker.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("keeps an answer screen open when another tab activates the worker", async () => {
    const api = await start();
    worker.dispatchEvent(new Event("controllerchange"));
    mocks.options!.onNeedReload!();
    expect(api.getPwaSnapshot().updateReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    await api.applyAppUpdate();
    expect(reload).toHaveBeenCalledOnce();
    expect(mocks.activate).not.toHaveBeenCalled();
  });

  it("does not mistake a first installation taking control for an update", async () => {
    worker.controller = null;
    const api = await start();
    worker.dispatchEvent(new Event("controllerchange"));
    expect(api.getPwaSnapshot().updateReady).toBe(false);
    mocks.options!.onOfflineReady!();
    expect(api.getPwaSnapshot().offlineReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it("allows retry when applying an update fails or times out", async () => {
    const api = await start();
    mocks.options!.onNeedRefresh!();
    mocks.activate.mockRejectedValueOnce(new Error("Worker failed"));
    await expect(api.applyAppUpdate()).resolves.toBeUndefined();
    expect(api.getPwaSnapshot()).toMatchObject({
      updateReady: true,
      updating: false,
      updateError: true,
    });
    await api.applyAppUpdate();
    expect(api.getPwaSnapshot()).toMatchObject({
      updating: true,
      updateError: false,
    });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(api.getPwaSnapshot()).toMatchObject({
      updating: false,
      updateError: true,
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it("checks on return and periodically, throttles repeated focus events, and skips hidden/offline checks", async () => {
    const api = await start();
    expect(registration.update).toHaveBeenCalledOnce();
    browser.dispatchEvent(new Event("focus"));
    await api.checkForUpdates();
    expect(registration.update).toHaveBeenCalledOnce();
    page.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(registration.update).toHaveBeenCalledOnce();
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await api.checkForUpdates();
    expect(registration.update).toHaveBeenCalledTimes(2);
    nav.onLine = false;
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(registration.update).toHaveBeenCalledTimes(2);
    nav.onLine = true;
    browser.dispatchEvent(new Event("online"));
    await api.checkForUpdates();
    expect(registration.update).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(registration.update).toHaveBeenCalledTimes(4);
  });

  it("coalesces concurrent checks and handles network failures without background error spam", async () => {
    const api = await start();
    registration.update.mockRejectedValue(new Error("Offline server"));
    await api.checkForUpdates(true);
    expect(api.getPwaSnapshot()).toMatchObject({
      checking: false,
      checkError: true,
    });
    await vi.advanceTimersByTimeAsync(60_001);
    await api.checkForUpdates();
    expect(api.getPwaSnapshot().checkError).toBe(false);
    let finish!: () => void;
    registration.update.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = api.checkForUpdates(true);
    const second = api.checkForUpdates(true);
    expect(first).toBe(second);
    await Promise.resolve();
    finish();
    await first;
    expect(api.getPwaSnapshot().checking).toBe(false);
  });
});
