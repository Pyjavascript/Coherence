import { useEffect, useRef, useState } from "react";
import { LIMITS } from "../lib/clientId";
import { Logo } from "../assets/globalAssets";
import { profileOf } from "./ProfileModal";

// Every row is [fixed 40px icon slot][label]. The icon slot never moves, so
// only the labels fade/slide when the sidebar expands or collapses.
function Row({ as: Tag = "button", className = "", icon, label, ...rest }) {
  return (
    <Tag type={Tag === "button" ? "button" : undefined} className={"lnav-row " + className} {...rest}>
      <span className="lnav-slot">{icon}</span>
      <span className="lnav-label">{label}</span>
    </Tag>
  );
}

const ProfileIcon = ({ src }) => (
  <span className="lnav-icon lnav-profile">
    {src ? (
      <img src={src} alt="" referrerPolicy="no-referrer" />
    ) : (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M4.5 20c.8-3.5 3.5-5.5 7.5-5.5s6.7 2 7.5 5.5" />
      </svg>
    )}
  </span>
);

export default function BrandSidebar({
  open, drawer, onToggle, onExpand, brands, currentId, onSelect, onNew, user, onLogin, onSignup, onProfile, usage, model,
}) {
  const [popover, setPopover] = useState(null); // null | "usage"
  const footerRef = useRef(null);

  // The cards are sized to the expanded panel; never leave one open on a collapsed rail.
  useEffect(() => { if (!open) setPopover(null); }, [open]);

  useEffect(() => {
    if (!popover) return undefined;
    const onDown = (event) => {
      if (footerRef.current && !footerRef.current.contains(event.target)) setPopover(null);
    };
    const onKey = (event) => { if (event.key === "Escape") setPopover(null); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  const generationsUsed = Math.min(LIMITS.generations, Math.max(0, usage?.generations || 0));
  const generationsLeft = LIMITS.generations - generationsUsed;
  const usagePercent = Math.round((generationsUsed / LIMITS.generations) * 100);
  const togglePopover = (name) => {
    if (!open) onExpand?.();
    setPopover((current) => (current === name ? null : name));
  };
  const tip = (text) => (open ? undefined : text);
  const profile = user ? profileOf(user) : null;

  return (
    <aside className="lnav" data-open={open} aria-label="Workspace navigation">
      <div className="lnav-head">
        <span className="lnav-slot">
          <span className="lnav-logo"><img src={Logo} alt="" /></span>
        </span>
        <span className="lnav-label lnav-title rail-product-name">Coherence Content<br />Orchestration</span>
      </div>

      <Row
        className="lnav-toggle"
        aria-expanded={open}
        aria-label={drawer ? "Close navigation" : open ? "Collapse sidebar" : "Expand sidebar"}
        title={drawer ? undefined : open ? "Collapse sidebar" : "Expand sidebar"}
        onClick={onToggle}
        icon={
          drawer ? (
            <svg className="lnav-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          ) : (
            <svg className="lnav-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
              <path className="lnav-glyph-bar" d="M9 4v16" />
            </svg>
          )
        }
        label=""
      />

      <Row
        className="lnav-add"
        title={tip("Add brand")}
        onClick={() => onNew("regular")}
        icon={<span className="lnav-plus" aria-hidden="true">+</span>}
        label="Add Brand"
      />

      <nav className="lnav-brands" aria-label="Brands">
        <div className="lnav-brand-list">
        {brands.map((brand) => (
          <Row
            key={brand.id}
            className={"lnav-item" + (brand.id === currentId ? " is-active" : "")}
            aria-current={brand.id === currentId ? "true" : undefined}
            title={tip(brand.name || "Untitled")}
            onClick={() => onSelect(brand.id)}
            icon={
              brand.logo ? (
                <span className="lnav-avatar"><img src={brand.logo} alt="" /></span>
              ) : (
                <span className="lnav-avatar lnav-avatar-fallback" style={{ "--brand-color": brand.color || "#373c9b" }}>
                  {(brand.name || "B").trim().charAt(0).toUpperCase()}
                </span>
              )
            }
            label={brand.name || "Untitled"}
          />
        ))}
        </div>
      </nav>

      <div className="lnav-footer" ref={footerRef}>
        {popover === "usage" && user && (
          <div className="rail-usage-card" role="dialog" aria-label="Credits">
            <div className="rail-usage-heading">
              <strong>{generationsLeft}/{LIMITS.generations}</strong>
              <span>Credits Left</span>
            </div>
            <div className="rail-reset-time">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8.25" />
                <path d="M12 7.5v5l3.25 2" />
              </svg>
              <span>Resets daily</span>
            </div>
            <div
              className={"rail-usage-bars" + (generationsUsed === LIMITS.generations ? " limit" : "")}
              role="img"
              aria-label={`${usagePercent}% of today's generation credits used`}
            >
              {Array.from({ length: LIMITS.generations }, (_, index) => (
                <i key={index} className={index < generationsUsed ? "used" : ""} aria-hidden="true" />
              ))}
            </div>
            <div className="rail-model-usage">
              <span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3.75v8.5h8.5" />
                  <path d="M19.8 15A8.25 8.25 0 1 1 9 4.1" />
                </svg>
                Model Usage
              </span>
              <b>{model || "Free"}</b>
            </div>
          </div>
        )}

        {user ? (
          <Row
            title={tip(profile.displayName || user.email)}
            aria-haspopup="dialog"
            onClick={() => { setPopover(null); onProfile(); }}
            icon={<ProfileIcon src={profile.avatar} />}
            label="Profile"
          />
        ) : (
          <Row title={tip("Log in")} onClick={onLogin} icon={<ProfileIcon />} label="Log in" />
        )}
        <Row
          className="rail-credits"
          aria-expanded={popover === "usage"}
          aria-label={`Credits used: ${usagePercent}%`}
          title={tip(`Credits used: ${usagePercent}%`)}
          onClick={() => (user ? togglePopover("usage") : onSignup?.())}
          icon={
            <span
              className="rail-credits-meter"
              style={{ "--credits-progress": `${usagePercent}%` }}
              data-percent={`${usagePercent}%`}
              aria-hidden="true"
            />
          }
          label="Credits used"
        />
      </div>
    </aside>
  );
}
