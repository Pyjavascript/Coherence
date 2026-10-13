import { useState, type FormEvent } from "react";
import BrandMark from "@web/components/BrandMark.jsx";
import { config } from "../config";
import host from "../host";

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

// Email + password sign-in with the user's existing Brand Language OS account.
export default function SignIn({ onSignIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError("");
    const { error: authError } = await onSignIn(email, password);
    setBusy(false);
    if (authError) setError(authError.message || "Couldn't sign in. Check your details and try again.");
  };

  const openWeb = () => host.openExternal(config.webUrl).catch(() => undefined);

  return (
    <div className="signin">
      <div className="signin-head">
        <BrandMark brand={{ id: "blos" }} className="signin-mark" />
        <h1>Brand Language OS</h1>
        <p className="muted">Sign in with your Brand Language OS account to use your brands in Figma.</p>
      </div>

      <form className="signin-form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="signin-foot muted">
        <p>
          Signed up with Google? Google sign-in can't open inside Figma. Connecting with a code from the web app is
          coming next.
        </p>
        {config.webUrl && (
          <button type="button" className="link" onClick={openWeb}>
            No account yet? Create one in the web app ↗
          </button>
        )}
      </div>
    </div>
  );
}
