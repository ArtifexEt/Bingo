import { useId, useState, useSyncExternalStore } from "react";
import {
  Download,
  ChevronRight,
  Info,
  LoaderCircle,
  RefreshCw,
  Share2,
  WifiOff,
} from "lucide-react";
import {
  appVersion,
  applyAppUpdate,
  checkForUpdates,
  getPwaSnapshot,
  getServerPwaSnapshot,
  requestAppInstall,
  subscribePwa,
} from "./pwa";
import { useTranslation } from "./i18n";
import "./pwa.css";

export default function PwaControls() {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    subscribePwa,
    getPwaSnapshot,
    getServerPwaSnapshot,
  );
  const [instructions, setInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const instructionsId = useId();
  const installHintId = useId();
  const checkHintId = useId();
  const hasFeedback =
    (state.checked && !state.checking && !state.updateReady) ||
    (state.updateReady && !deferred) ||
    state.updateError ||
    state.checkError ||
    installError ||
    (state.manualInstall && instructions && !state.installed) ||
    !state.online;

  async function install() {
    setInstallError(false);
    if (!state.canPrompt) {
      setInstructions(!instructions);
      return;
    }
    setInstalling(true);
    try {
      await requestAppInstall();
    } catch {
      setInstallError(true);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="pwa-controls">
      {!state.installed &&
        (state.canPrompt || state.manualInstall || installing) && (
          <button
            className="settings-row pwa-install"
            type="button"
            disabled={installing}
            aria-label={t(installing ? "pwa.installOpening" : "pwa.install")}
            aria-describedby={installHintId}
            aria-expanded={state.manualInstall ? instructions : undefined}
            aria-controls={state.manualInstall ? instructionsId : undefined}
            onClick={() => void install()}
          >
            {installing ? (
              <LoaderCircle
                size={20}
                className="settings-row-icon spin"
                aria-hidden="true"
              />
            ) : (
              <Download
                size={20}
                className="settings-row-icon"
                aria-hidden="true"
              />
            )}
            <span className="settings-row-copy">
              <span className="settings-row-title">
                {t(installing ? "pwa.installOpening" : "pwa.install")}
              </span>
              <span className="settings-row-description" id={installHintId}>
                {t("pwa.installHint")}
              </span>
            </span>
            <ChevronRight
              size={16}
              className="settings-row-chevron"
              aria-hidden="true"
            />
          </button>
        )}
      {state.canUpdate && (
        <button
          className="settings-row pwa-check"
          type="button"
          aria-label={t(
            state.updateReady
              ? "pwa.newVersion"
              : state.checking
                ? "pwa.checking"
                : "pwa.check",
          )}
          aria-describedby={checkHintId}
          disabled={
            state.checking ||
            state.updating ||
            (!state.online && !state.updateReady)
          }
          onClick={() =>
            state.updateReady ? setDeferred(false) : void checkForUpdates(true)
          }
        >
          <RefreshCw
            size={20}
            className={`settings-row-icon${state.checking ? " spin" : ""}`}
            aria-hidden="true"
          />
          <span className="settings-row-copy">
            <span className="settings-row-title">
              {t(
                state.updateReady
                  ? "pwa.newVersion"
                  : state.checking
                    ? "pwa.checking"
                    : "pwa.check",
              )}
            </span>
            <span className="settings-row-description" id={checkHintId}>
              {t("pwa.checkHint")}
            </span>
          </span>
          <ChevronRight
            size={16}
            className="settings-row-chevron"
            aria-hidden="true"
          />
        </button>
      )}
      <div className="settings-row pwa-version-row">
        <Info size={20} className="settings-row-icon" aria-hidden="true" />
        <span className="settings-row-copy">
          <span className="settings-row-title">{t("pwa.version")}</span>
          <span className="settings-row-description pwa-version">
            {appVersion === "dev"
              ? t("pwa.localVersion")
              : `Bingo · ${appVersion}`}
          </span>
        </span>
      </div>
      {hasFeedback && (
        <div className="pwa-feedback">
          {state.checked && !state.checking && !state.updateReady && (
            <p className="pwa-check-result" role="status">
              {t("pwa.checked")}
            </p>
          )}
          {state.updateReady && !deferred && (
            <div className="pwa-update" role="status">
              <RefreshCw size={20} aria-hidden="true" />
              <div>
                <strong>{t("pwa.updateReady")}</strong>
                <p>{t("pwa.updateHint")}</p>
              </div>
              <div className="pwa-update-actions">
                <button
                  className="primary"
                  type="button"
                  disabled={state.updating}
                  onClick={() => void applyAppUpdate()}
                >
                  {state.updating && (
                    <LoaderCircle
                      size={16}
                      className="spin"
                      aria-hidden="true"
                    />
                  )}
                  {t(state.updating ? "pwa.updating" : "pwa.update")}
                </button>
                <button
                  className="quiet"
                  type="button"
                  disabled={state.updating}
                  onClick={() => setDeferred(true)}
                >
                  {t("pwa.later")}
                </button>
              </div>
            </div>
          )}
          {state.updateError && (
            <p className="pwa-error" role="alert">
              {t("pwa.updateError")}
            </p>
          )}
          {state.checkError && (
            <p className="pwa-error" role="status">
              {t("pwa.checkError")}
            </p>
          )}
          {installError && (
            <p className="pwa-error" role="alert">
              {t("pwa.installError")}
            </p>
          )}
          {state.manualInstall && instructions && !state.installed && (
            <ol className="pwa-install-steps" id={instructionsId}>
              <li>
                <Share2 size={17} aria-hidden="true" />
                {t("pwa.iosShare")}
              </li>
              <li>{t("pwa.iosAdd")}</li>
            </ol>
          )}
          {!state.online && (
            <p className="pwa-offline" role="status">
              <WifiOff size={16} aria-hidden="true" />
              {t("pwa.offline")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
