import { useEffect, useId, useRef, useState } from "react";
import { CloseBar, useDialogBehavior, useOverlayDismiss } from "./Modal";
import FigmaLogo from "./FigmaLogo";
import { useAuth } from "../hooks/useAuth";
import { resizeAvatarFile } from "../lib/image";
import { requireSupabase } from "../lib/supabase";

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

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
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

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8v.2" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.7-8.7M16.5 6.5l2.5 2.5M14 9l2 2" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </svg>
);

const MASK = "•".repeat(22);

function rawPluginKey(data) {
  const bag = data && typeof data.data === "object" && data.data ? data.data : data;
  const key = bag?.key || bag?.apiKey || bag?.pluginApiKey || bag?.plugin_api_key || "";
  return typeof key === "string" ? key.trim() : "";
}

// Collapsed: a "Figma plugin" row with its status and an arrow. Open: the key,
// how to connect the plugin, and generate / revoke.
function PluginAccess({ userId }) {
  const [row, setRow] = useState(null);
  const [freshKey, setFreshKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const sectionRef = useRef(null);
  const scrollFrame = useRef(0);
  const scrollTarget = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const panelId = useId();

  const load = async () => {
    const { data, error: loadError } = await requireSupabase()
      .from("plugin_keys")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (loadError) {
      setError(loadError.message || "Couldn't load your plugin key.");
      return;
    }
    setRow(data);
  };

  useEffect(() => {
    load();
    // The row is this account's key. Reload only when the account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const generate = async () => {
    setBusy(true);
    setError("");
    setCopied(false);
    const { data, error: invokeError } = await requireSupabase().functions.invoke("generate-plugin-key");
    setBusy(false);
    if (invokeError) return setError(invokeError.message || "Couldn't generate a plugin key.");
    const key = rawPluginKey(data);
    if (!key) return setError(data?.error || "The key service didn't return a key.");
    setFreshKey(key);
    setRevealed(false);
    await load();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy the key. Show it, then select and copy it manually.");
    }
  };

  const revoke = async () => {
    if (!row?.id) return;
    setBusy(true);
    setError("");
    const { error: deleteError } = await requireSupabase().from("plugin_keys").delete().eq("id", row.id);
    setBusy(false);
    if (deleteError) return setError(deleteError.message || "Couldn't revoke the key.");
    setRow(null);
    setFreshKey("");
  };

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  // The dialog keeps the height it had; opening the card scrolls the details
  // into view inside it instead of making the dialog taller.
  const toggle = () => {
    const section = sectionRef.current;
    const modal = section?.closest(".profile-modal");
    cancelAnimationFrame(scrollFrame.current);
    if (!open && modal) {
      modal.style.height = `${modal.offsetHeight}px`;
      scrollToDetails(modal, section);
    }
    setOpen(!open);
  };

  const scrollToDetails = (modal, section) => {
    const pad = 16;
    const top = section.getBoundingClientRect().top - modal.getBoundingClientRect().top + modal.scrollTop;
    // The details are still collapsed: add their full height to find the card's open bottom.
    const bottom = top + section.offsetHeight + section.querySelector(".pa-inner").scrollHeight;
    const target = Math.max(modal.scrollTop, Math.min(top - pad, bottom + pad - modal.clientHeight));
    scrollTarget.current = target;
    const from = modal.scrollTop;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 560;
    const start = performance.now();
    const step = (now) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      // Ease-out cubic. The browser clamps to what has expanded so far, and
      // the card grows faster than this, so the scroll follows it smoothly.
      modal.scrollTop = from + (target - from) * (1 - (1 - t) ** 3);
      if (t < 1) scrollFrame.current = requestAnimationFrame(step);
    };
    scrollFrame.current = requestAnimationFrame(step);
  };

  const onCollapseEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    const modal = sectionRef.current?.closest(".profile-modal");
    if (!modal) return;
    // Opened: if a slow device dropped frames, finish the scroll.
    if (open && modal.scrollTop < scrollTarget.current - 1) {
      modal.scrollTo({ top: scrollTarget.current, behavior: "smooth" });
    }
    // Closed: the dialog may size to its content again.
    if (!open) modal.style.height = "";
  };

  const created = row?.created_at
    ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "";
  const shownKey = freshKey
    ? revealed ? freshKey : `coh_${MASK}${freshKey.slice(-4)}`
    : `coh_${MASK}`;

  return (
    <section ref={sectionRef} className={"plugin-access" + (open ? " is-open" : "")}>
      <button
        type="button"
        className="pa-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="pa-logo"><FigmaLogo /></span>
        <span className="pa-heading">
          <span className="pa-title">Figma plugin</span>
          <span className="pa-sub">{row ? `Key created ${created}` : "Use your brands inside Figma"}</span>
        </span>
        <span className={"pa-status" + (row ? " is-on" : "")}>{row ? "Active" : "Not set up"}</span>
        <span className="pa-chevron"><ChevronIcon /></span>
      </button>

      {/* grid-template-rows 0fr → 1fr animates to the content's real height. */}
      <div id={panelId} className="pa-collapse" inert={open ? undefined : ""} onTransitionEnd={onCollapseEnd}>
        <div className="pa-inner">
          <div className="pa-body">
            <div className="pa-info" role="note">
              <InfoIcon />
              <p>This key links Figma to your account. Keep it private.</p>
            </div>

            {row || freshKey ? (
              <div className="pa-key">
                <div className="pa-key-head">
                  <span className="pa-key-name">Plugin key</span>
                  {created && <span className="pa-key-date">Created {created}</span>}
                </div>
                <div className="pa-key-field">
                  <code aria-label={freshKey && revealed ? "Plugin API key" : "Plugin API key, hidden"}>{shownKey}</code>
                  {freshKey && (
                    <>
                      <button
                        type="button"
                        className="pa-icon-btn"
                        onClick={() => setRevealed((r) => !r)}
                        aria-label={revealed ? "Hide key" : "Show key"}
                        title={revealed ? "Hide key" : "Show key"}
                      >
                        <EyeIcon off={revealed} />
                      </button>
                      <button
                        type="button"
                        className={"pa-icon-btn" + (copied ? " is-done" : "")}
                        onClick={copy}
                        aria-label={copied ? "Copied" : "Copy key"}
                        title={copied ? "Copied" : "Copy key"}
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </>
                  )}
                </div>
                <p className={"pa-key-note" + (freshKey ? " is-warn" : "")}>
                  {freshKey
                    ? "Copy it now. It won't be shown again."
                    : "Shown only once. Lost it? Generate a new one."}
                </p>
              </div>
            ) : (
              <div className="pa-empty">
                <span className="pa-empty-icon"><KeyIcon /></span>
                <strong>No plugin key yet</strong>
                <span>Create one to use your brands in Figma.</span>
              </div>
            )}

            {error && <p className="auth-error pa-error" role="alert">{error}</p>}

            <div className="pa-actions">
              <button type="button" className="profile-save" onClick={generate} disabled={busy}>
                {busy ? "Working…" : row ? "Generate new key" : "Create plugin key"}
              </button>
              {row && (
                <button type="button" className="profile-delete" onClick={revoke} disabled={busy}>
                  Revoke
                </button>
              )}
            </div>

            <ol className="pa-steps" aria-label="Connect the plugin">
              <li><span>Copy your key.</span></li>
              <li><span>In Figma: <b>Plugins › Brand Language OS › Set API key</b>.</span></li>
              <li><span>Paste and save.</span></li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

// Account dialog: photo (click the avatar), name, read-only email, save / cancel, log out, and a
// second "are you sure?" step for deleting the account.
export default function ProfileModal({ user, onClose, onLogout, onSaved, onDeleted }) {
  const { updateProfile, deleteAccount } = useAuth();
  const initial = profileOf(user);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [step, setStep] = useState("edit"); // "edit" | "delete"
  const [editing, setEditing] = useState(false); // name + email fields shown
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titleId = useId();
  const editId = useId();
  const editRef = useRef(null);
  const deleteTitleId = useId();
  const deleteBodyId = useId();
  const fileRef = useRef(null);
  const firstNameRef = useRef(null);
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

  // Cancel puts the saved values back and tucks the fields away, without
  // closing the dialog.
  const revert = () => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setAvatar(initial.avatar);
    setError("");
    setEditing(false);
    editRef.current?.focus({ preventScroll: true });
  };

  // Opening the editor puts the cursor in the first name field.
  const shownEditing = useRef(editing);
  useEffect(() => {
    if (shownEditing.current === editing) return;
    shownEditing.current = editing;
    if (editing) firstNameRef.current?.focus({ preventScroll: true });
  }, [editing]);

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
                All brands, notes and history for <b>{user.email}</b> will be deleted.
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
              <button
                type="button"
                ref={editRef}
                className={"profile-pill profile-edit-btn" + (editing ? " is-on" : "")}
                aria-expanded={editing}
                aria-controls={editId}
                onClick={() => setEditing((open) => !open)}
              >
                <PencilIcon />
                Edit profile
              </button>
            </div>

            <div className="profile-id">
              <h2 id={titleId}>{name || "Your profile"}</h2>
              <p title={user.email}>{user.email}</p>
            </div>

            {/* Name + email stay tucked away until Edit profile slides them open. */}
            <div id={editId} className="profile-edit" data-open={editing} inert={editing ? undefined : ""}>
            <div className="profile-edit-inner">
            <div className="profile-rows">
              <div className="profile-row" role="group" aria-labelledby={`${titleId}-name`}>
                <span className="profile-row-label" id={`${titleId}-name`}>Name</span>
                <div className="profile-name-fields">
                  <input
                    ref={firstNameRef}
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
                <label className="profile-row-label" htmlFor={`${titleId}-email`}>Email</label>
                <div className="profile-input-icon">
                  <MailIcon />
                  <input
                    id={`${titleId}-email`}
                    className="profile-input"
                    type="email"
                    value={user.email || ""}
                    readOnly
                    title="Used to sign in. Can't be changed."
                  />
                </div>
              </div>
            </div>
            </div>
            </div>

            <PluginAccess userId={user.id} />

            {error && <p className="auth-error profile-error" role="alert">{error}</p>}

            {/* Account actions: copy left, button right. */}
            <div className="pl-acct-rows">
              <div className="pl-acct-row">
                <div className="pl-acct-copy">
                  <strong>Log out</strong>
                  <p>Sign out on this device.</p>
                </div>
                <button type="button" className="profile-pill" onClick={onLogout}>
                  <LogoutIcon />
                  Log out
                </button>
              </div>
              <div className="pl-acct-row">
                <div className="pl-acct-copy">
                  <strong>Delete account</strong>
                  <p>Erase your account and all its data.</p>
                </div>
                <button type="button" ref={deleteRef} className="profile-delete" onClick={() => setStep("delete")} disabled={busy}>
                  <TrashIcon />
                  Delete account
                </button>
              </div>
            </div>

            {/* Cancel / Save only while there's something to save. */}
            {(dirty || busy) && (
              <div className="profile-actions">
                <div className="profile-actions-end">
                  <button type="button" className="profile-cancel" onClick={revert} disabled={busy}>Cancel</button>
                  <button type="submit" className="profile-save" disabled={busy || !dirty}>
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
