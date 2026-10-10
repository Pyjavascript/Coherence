import { useEffect, useId, useRef, useState } from "react";
import { CloseBar, useDialogBehavior, useOverlayDismiss } from "./Modal";
import { useAuth } from "../hooks/useAuth";
import { resizeAvatarFile } from "../lib/image";

// Our own metadata keys, so a Google sign-in (which rewrites full_name /
// avatar_url / picture) never clobbers what the user set here. An `avatar`
// of "" means the user removed their photo, so don't fall back to Google's.
export function profileOf(user) {
  const meta = user?.user_metadata || {};
  const full = (meta.full_name || meta.name || "").trim();
  const [first = "", ...rest] = full ? full.split(/\s+/) : [];
  const firstName = meta.first_name ?? first;
  const lastName = meta.last_name ?? rest.join(" ");
  return {
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    avatar: meta.avatar ?? (meta.avatar_url || meta.picture || ""),
  };
}

function initialsOf(name, email) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length) return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (email || "?").charAt(0).toUpperCase();
}

export function ProfileAvatar({ src, name, email, className = "" }) {
  return (
    <span className={"profile-avatar " + className}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initialsOf(name, email)}</span>}
    </span>
  );
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4.5h3.5A2.5 2.5 0 0 1 20 7v10a2.5 2.5 0 0 1-2.5 2.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h9.5" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
    <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.2" />
    <path d="M10 10.5v6M14 10.5v6" />
  </svg>
);

// Account dialog: photo (click the avatar), name, read-only email, save / cancel, log out, and a
// second "are you sure?" step for deleting the account.
export default function ProfileModal({ user, onClose, onLogout, onSaved, onDeleted }) {
  const { updateProfile, deleteAccount } = useAuth();
  const initial = profileOf(user);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [step, setStep] = useState("edit"); // "edit" | "delete"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titleId = useId();
  const deleteTitleId = useId();
  const deleteBodyId = useId();
  const fileRef = useRef(null);
  const keepRef = useRef(null);
  const deleteRef = useRef(null);

  // Esc / clicking outside steps back out of the delete prompt before closing.
  const dismissDialog = () => {
    if (busy) return;
    if (step === "delete") return setStep("edit");
    onClose();
  };
  const panelRef = useDialogBehavior(dismissDialog);
  const dismiss = useOverlayDismiss(dismissDialog);

  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    setError("");
    (step === "delete" ? keepRef : deleteRef).current?.focus();
  }, [step]);

  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const dirty = firstName.trim() !== initial.firstName
    || lastName.trim() !== initial.lastName
    || avatar !== initial.avatar;

  const pickPhoto = () => fileRef.current?.click();

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again should still fire
    if (!file) return;
    setError("");
    try {
      setAvatar(await resizeAvatarFile(file));
    } catch {
      setError("That file couldn't be read — choose a JPG, PNG or WebP image.");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!dirty) return onClose();
    setBusy(true);
    setError("");
    const { error: saveError } = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar,
    });
    setBusy(false);
    if (saveError) return setError(saveError.message || "Couldn't save your profile — try again.");
    onSaved?.();
    onClose();
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError("");
    const { error: deleteError } = await deleteAccount();
    setBusy(false);
    if (deleteError) return setError(deleteError.message || "Couldn't delete your account — try again.");
    onDeleted?.();
  };

  const deleting = step === "delete";

  // One <section> for both steps: useDialogBehavior keeps hold of the element
  // it mounted with, so swapping panels would break the focus trap.
  return (
    <div className="overlay profile-overlay" {...dismiss}>
      <section
        ref={panelRef}
        className={"profile-modal" + (deleting ? " profile-confirm" : "")}
        role={deleting ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={deleting ? deleteTitleId : titleId}
        aria-describedby={deleting ? deleteBodyId : undefined}
      >
        {deleting ? (
          <>
            <span className="confirm-icon"><TrashIcon /></span>
            <h2 id={deleteTitleId} className="confirm-title">Delete your account?</h2>
            <div id={deleteBodyId} className="confirm-text">
              <p className="confirm-body">
                All saved brands, research notes, and generation history associated with <b>{user.email}</b> will be permanently deleted.
              </p>
              <p className="confirm-note">This can't be undone.</p>
            </div>
            {error && <p className="auth-error profile-confirm-error" role="alert">{error}</p>}
            <div className="confirm-actions">
              <button type="button" ref={keepRef} className="confirm-cancel" onClick={() => setStep("edit")} disabled={busy}>
                Keep account
              </button>
              <button type="button" className="confirm-ok is-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={save} noValidate>
            <div className="profile-banner">
              <button type="button" className="profile-close" aria-label="Close profile" onClick={dismissDialog}><CloseBar /></button>
            </div>

            <div className="profile-head">
              <button type="button" className="profile-photo-trigger" onClick={pickPhoto} aria-label="Change profile photo">
                <ProfileAvatar src={avatar} name={name} email={user.email} className="is-lg" />
                <span className="profile-photo-badge"><CameraIcon /></span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              <button type="button" className="profile-pill" onClick={onLogout}>
                <LogoutIcon />
                Log out
              </button>
            </div>

            <div className="profile-id">
              <h2 id={titleId}>{name || "Your profile"}</h2>
              <p title={user.email}>{user.email}</p>
            </div>

            <div className="profile-rows">
              <div className="profile-row" role="group" aria-labelledby={`${titleId}-name`}>
                <span className="profile-row-label" id={`${titleId}-name`}>Name</span>
                <div className="profile-name-fields">
                  <input
                    className="profile-input"
                    aria-label="First name"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    maxLength={60}
                  />
                  <input
                    className="profile-input"
                    aria-label="Last name"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="profile-row">
                <label className="profile-row-label" htmlFor={`${titleId}-email`}>Email address</label>
                <div className="profile-input-icon">
                  <MailIcon />
                  <input id={`${titleId}-email`} className="profile-input" type="email" value={user.email || ""} readOnly />
                </div>
              </div>
            </div>

            {error && <p className="auth-error profile-error" role="alert">{error}</p>}

            <div className="profile-actions">
              <button type="button" ref={deleteRef} className="profile-delete" onClick={() => setStep("delete")} disabled={busy}>
                <TrashIcon />
                Delete account
              </button>
              <div className="profile-actions-end">
                <button type="button" className="profile-cancel" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="submit" className="profile-save" disabled={busy || !dirty}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
