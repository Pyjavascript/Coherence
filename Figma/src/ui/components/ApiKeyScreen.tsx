import { useState, type FormEvent } from "react";
import { isPluginKey } from "../hooks/usePluginSession";
import { PROFILE_PATH, hasWebApp, openWebApp } from "../lib/webApp";
import { ArrowIcon, ExternalIcon, EyeIcon, FigmaLogo, InfoIcon, LogoMark } from "./icons";

interface Props {
  error: string;
  hasWorkspace: boolean;
  onSave: (key: string) => Promise<boolean>;
  onContinue: () => void;
}

export default function ApiKeyScreen({ error, hasWorkspace, onSave, onContinue }: Props) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isPluginKey(value)) {
      setLocalError("Paste the key from your profile. It starts with coh_.");
      return;
    }
    setBusy(true);
    setLocalError("");
    const ok = await onSave(value);
    setBusy(false);
    if (ok) onContinue();
  };

  const openProfile = () => openWebApp(PROFILE_PATH);

  const message = localError || error;

  return (
    <div className="link-screen">
      <div className="link-hero">
        <div className="link-art" aria-hidden="true">
          <span className="link-tile"><FigmaLogo /></span>
          <span className="link-wire"><span /></span>
          <span className="link-tile is-brand"><LogoMark /></span>
        </div>
        <h1>Link your account</h1>
        <p>Connect this plugin to Brand Language OS to write on-brand copy right on the canvas.</p>
      </div>

      <form className="card link-form" onSubmit={submit} noValidate>
        <label className="field-label" htmlFor="plugin-key">Plugin API key</label>
        <div className={"key-input" + (message ? " is-invalid" : "")}>
          <input
            id="plugin-key"
            type={shown ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="coh_…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? "plugin-key-error" : undefined}
            autoFocus
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide key" : "Show key"}
            title={shown ? "Hide key" : "Show key"}
          >
            <EyeIcon off={shown} />
          </button>
        </div>
        {message && (
          <p id="plugin-key-error" className="form-error" role="alert">
            {message}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !value.trim()}>
          {busy ? <span className="spinner is-light" aria-hidden="true" /> : null}
          {busy ? "Checking key…" : "Connect"}
          {!busy && <ArrowIcon />}
        </button>
      </form>

      <div className="card link-steps">
        <div className="callout">
          <InfoIcon />
          <p>Your key is shown once when you create it. Lost it? Generate a new one; the old key stops working when you revoke it.</p>
        </div>
        <ol className="steps">
          <li>
            <span>
              Open your{" "}
              {hasWebApp ? (
                <button type="button" className="inline-link" onClick={openProfile}>
                  Profile
                </button>
              ) : (
                <b>Profile</b>
              )}{" "}
              in the Brand Language OS web app.
            </span>
          </li>
          <li><span>Under <b>Figma plugin</b>, create a key and copy it.</span></li>
          <li><span>Paste it above and connect.</span></li>
        </ol>
        {hasWebApp && (
          <button type="button" className="btn btn-soft btn-block" onClick={openProfile}>
            Open Brand Language OS
            <ExternalIcon />
          </button>
        )}
      </div>

      {hasWorkspace && (
        <button type="button" className="link link-back" onClick={onContinue}>
          Back to workspace
        </button>
      )}
    </div>
  );
}
