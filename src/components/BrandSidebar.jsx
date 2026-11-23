import { useLayoutEffect, useRef } from "react";
import { LIMITS } from "../lib/clientId";
import { profileOf } from "./ProfileModal";
import BrandMark from "./BrandMark";
import BrandLogo from "./BrandLogo";
import { useCountUp } from "../hooks/useCountUp";

// Labels fade in one after another when the sidebar opens; --pl-li is a
// label's place in that sequence (capped, so long brand lists don't lag).
const labelOrder = (i) => ({ "--pl-li": Math.min(i, 8) });

// Every row is [fixed 40px icon slot][label]. The icon slot never moves, so
// only the labels fade/slide when the sidebar expands or collapses.
// fit: a fixed label the open rail is sized to (see useFitLabels).
function Row({ as: Tag = "button", className = "", icon, label, order = 0, fit = false, ...rest }) {
  return (
    <Tag type={Tag === "button" ? "button" : undefined} className={"lnav-row " + className} {...rest}>
      <span className="lnav-slot">{icon}</span>
      <span className="lnav-label" style={labelOrder(order)} data-fit={fit || undefined}>{label}</span>
    </Tag>
  );
}

// Widest a fitted label may make the rail: the profile name is fitted so it
// shows in full, but a very long name (or an email) ellipsizes past this.
const FIT_MAX = 200;

// The open rail is as wide as its widest fitted label ([data-fit]: Minimize,
// Add Brand, Log in, Credits used, the profile name up to FIT_MAX) and no wider, so the space
// after the labels matches the shell padding before the icons (layout.css
// --lnav-open). Labels have a fixed box, so the text itself is measured.
// Brand names don't widen it; they ellipsize. Re-measured when fonts load, on
// resize (the type sizes follow the viewport) and when the profile name changes.
function useFitLabels(rootRef, profileName) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      const range = document.createRange();
      let widest = 0;
      root.querySelectorAll("[data-fit]").forEach((label) => {
        range.selectNodeContents(label);
        widest = Math.max(widest, range.getBoundingClientRect().width);
      });
      widest = Math.min(widest, FIT_MAX);
      if (widest) document.documentElement.style.setProperty("--lnav-label-w", `${Math.ceil(widest) + 1}px`);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty("--lnav-label-w");
    };
  }, [rootRef, profileName]);
}

// The CC logo (src/assets/sidebar/logo.svg) without its tile: the white "CC"
// straight on the rail's theme-colour card. The viewBox is cropped to the
// mark, so CSS sizes the "CC" itself; it sits centred in a full, transparent
// icon box (layout.css .lnav-mark).
const RailLogo = () => (
  <svg className="lnav-mark" viewBox="8.85 12 32.3 26" fill="#fff" aria-hidden="true">
    <path d="M14.06 12h10.4v5.2h-10.4zM8.85 17.2h5.2v15.6h-5.2zM14.06 32.8h10.4V38h-10.4z" />
    <path d="M35.87 12h5.28v5.2h-5.28zM30.67 17.2h5.2v15.6h-5.2zM35.87 32.8h5.28V38h-5.28z" />
  </svg>
);

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
  open, closeInHead = false, brands, brandsLoaded = true, currentId, onSelect, onNew, user, onLogin, onSignup, onProfile, onUsage, usage,
}) {
  // No brands yet: Add Brand drops into its (always centred) slot. Not while
  // the list is still loading, so it doesn't animate for people who do have
  // brands.
  const empty = brandsLoaded && brands.length === 0;
  const generationsUsed = Math.min(LIMITS.generations, Math.max(0, usage?.generations || 0));
  const usagePercent = Math.round((generationsUsed / LIMITS.generations) * 100);
  // The ring's number counts up whenever usage changes.
  const shownPercent = useCountUp(usagePercent, 720);
  const tip = (text) => (open ? undefined : text);
  const profile = user ? profileOf(user) : null;
  const profileName = profile ? profile.displayName || user.email : "";
  const rootRef = useRef(null);
  useFitLabels(rootRef, profileName);

  const addRow = (
    <Row
      order={3}
      className={"lnav-add" + (empty ? " is-centred" : "")}
      title={tip("Add brand")}
      onClick={() => onNew("regular")}
      icon={
        // The rail's glyph box (layout.css .lnav-glyph), centred in its slot:
        // a bare white "+" on the card. Drawn on Node Studio's "+" grid
        // (22 units, 15-unit bars, 2.4 stroke) so the two pluses match.
        <svg className="lnav-glyph" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 3.5v15M3.5 11h15" /></svg>
      }
      label="Add Brand"
      fit
    />
  );

  return (
    <aside className="lnav" ref={rootRef} data-open={open} aria-label="Workspace navigation">
      {/* Top: the CC logo (laptops and tablets: the rail never opens, so it
          has no open/close toggle), then the profile and credits used, side
          by side in the column. Phones show the logo in the top bar instead,
          and the drawer closes by tapping the scrim beside it (or Escape). */}
      <div className="lnav-top">
      {!closeInHead && (
        <div className="lnav-row lnav-brandmark" role="img" aria-label="Coherence Content Orchestration">
          <span className="lnav-slot"><RailLogo /></span>
        </div>
      )}

      {user ? (
        <Row
          order={1}
          title={tip(profileName)}
          aria-haspopup="dialog"
          onClick={onProfile}
          icon={<ProfileIcon src={profile.avatar} />}
          label={profileName}
          fit
        />
      ) : (
        <Row order={1} title={tip("Log in")} onClick={onLogin} icon={<ProfileIcon />} label="Log in" fit />
      )}
      <Row
        order={2}
        className="rail-credits"
        aria-haspopup={user ? "dialog" : undefined}
        aria-label={`Credits used: ${usagePercent}%`}
        title={tip(`Credits used: ${usagePercent}%`)}
        onClick={user ? onUsage : onLogin}
        icon={
          <span
            className="rail-credits-meter"
            style={{ "--credits-progress": `${usagePercent}%`, "--pl-pct": shownPercent }}
            data-percent={`${usagePercent}%`}
            data-pl-count={shownPercent !== usagePercent || undefined}
            aria-hidden="true"
          />
        }
        label="Credits used"
        fit
      />
      </div>

      {/* Add Brand: always in the middle of the rail. */}
      <div className="lnav-centre">{addRow}</div>

      {/* Brands: stacked from the bottom of the rail up; the list scrolls
          when it doesn't fit. */}
      <nav className="lnav-brands" aria-label="Brands">
        <div className="lnav-brand-list">
        {brands.map((brand, i) => (
          <Row
            key={brand.id}
            order={4 + i}
            className={"lnav-item" + (brand.id === currentId ? " is-active" : "")}
            aria-current={brand.id === currentId ? "true" : undefined}
            title={tip(brand.name || "Untitled")}
            onClick={() => onSelect(brand.id)}
            icon={
              brand.logo ? (
                <BrandLogo src={brand.logo} className="lnav-avatar" />
              ) : (
                <span className="lnav-avatar lnav-avatar-fallback"><BrandMark brand={brand} /></span>
              )
            }
            label={brand.name || "Untitled"}
          />
        ))}
        </div>
      </nav>
    </aside>
  );
}
