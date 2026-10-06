import { useEffect, useState } from "react";

const getTone = (status, unavailable) => {
  if (status.text) {
    if (status.cls === "err") return "error";
    if (status.cls === "ok") return "success";
    if (status.cls === "warn") return "warning";
    return "info";
  }
  return unavailable ? "warning" : "";
};

export default function StatusBar({ status, unavailable }) {
  const message = status.text || unavailable;
  const tone = getTone(status, unavailable);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message, status, tone]);

  return (
    <div className={`toast toast-${tone}${!message || dismissed ? " toast-hidden" : ""}`} role="alert" aria-live="assertive">
      {tone === "error" && (
        <span className="toast-icon toast-icon-error" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      )}
      {tone === "info" && <span className="toast-icon toast-icon-info" aria-hidden="true">i</span>}
      <p className="toast-text">{message}</p>
      <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => setDismissed(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
    </div>
  );
}
