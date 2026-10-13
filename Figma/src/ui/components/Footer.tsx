import { useState } from "react";
import { LIMITS } from "@web/lib/clientId.js";
import { config } from "../config";
import host from "../host";

interface Props {
  status: { text: string; tone?: "ok" | "err" };
  creditsUsed: number;
  brandsUsed: number;
  email: string;
  onSignOut: () => void;
}

// Status line (messages, or today's free allowance), "Open full app", account menu.
export default function Footer({ status, creditsUsed, brandsUsed, email, onSignOut }: Props) {
  const [menu, setMenu] = useState(false);
  const atLimit = creditsUsed >= LIMITS.generations;
  const brands = Math.max(0, brandsUsed);

  return (
    <footer className="footer">
      <span className={"footer-status" + (status.tone ? " is-" + status.tone : "")} role="status" aria-live="polite">
        {status.text || (
          <>
            <span className={"dot" + (atLimit ? " is-err" : "")} aria-hidden="true" />
            {creditsUsed}/{LIMITS.generations} generations · {brands}/{LIMITS.brands} brands
          </>
        )}
      </span>
      <span className="footer-actions">
        {config.webUrl && (
          <button type="button" className="link" onClick={() => host.openExternal(config.webUrl).catch(() => undefined)}>
            Open full app ↗
          </button>
        )}
        <span className="account">
          <button
            type="button"
            className="link"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            Account
          </button>
          {menu && (
            <span className="account-menu" role="menu">
              <span className="account-email muted small">{email}</span>
              <button
                type="button"
                role="menuitem"
                className="btn btn-small btn-block"
                onClick={() => {
                  setMenu(false);
                  onSignOut();
                }}
              >
                Sign out of the plugin
              </button>
            </span>
          )}
        </span>
      </span>
    </footer>
  );
}
