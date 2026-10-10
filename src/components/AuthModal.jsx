import { useState } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../hooks/useAuth";

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.36 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

function PasswordField({ id, label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input id={id} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder="••••••••" required minLength={6} autoComplete={id === "auth-password" ? "current-password" : "new-password"} />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onMouseDown={(e) => e.preventDefault()} onClick={() => setVisible((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
            {!visible && <path d="M4 20 20 4" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AuthModal({ onClose, onSuccess, initialMode = "login" }) {
  const { login, signup, signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirmPassword) {
      return setError("Passwords do not match. Please try again.");
    }
    setLoading(true);
    const { data, error: authError } = isLogin
      ? await login(email, password)
      : await signup(email, password);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else if (!isLogin && !data?.session) {
      // Supabase returns a user with no identities when the email is already registered.
      if (data?.user && data.user.identities?.length === 0) {
        return setError("An account with this email already exists. Please log in.");
      }
      setAwaitingConfirm(true);
    } else {
      (onSuccess || onClose)();
    }
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setError("");
    setAwaitingConfirm(false);
  };

  return (
    <Modal
      title={isLogin ? "Welcome back!" : "Create an Account"}
      subtitle={
        <>
          {isLogin ? "Need an account? " : "Already have an account? "}
          <button type="button" className="auth-switch" onClick={switchMode}>{isLogin ? "Sign up" : "Log in"}</button>
        </>
      }
      onClose={onClose}
      modalClassName="auth-modal"
      overlayClassName="auth-overlay"
    >
      <div className="auth-card">
        {awaitingConfirm ? (
          <>
            <p className="auth-notice" role="status">
              <strong>Please confirm your email.</strong> We sent a verification link to {email}. Open it to activate your account, then log in.
            </p>
            <a className="auth-submit auth-link" href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer">
              Open Gmail
            </a>
          </>
        ) : (
        <>
        <button type="button" className="auth-google" onClick={handleGoogleSignIn} disabled={loading}>
          <GoogleIcon />
          Sign in with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" required autoComplete="email" />
          </div>
          <PasswordField id="auth-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {!isLogin && (
            <PasswordField id="auth-confirm" label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>
        </>
        )}
      </div>
    </Modal>
  );
}
