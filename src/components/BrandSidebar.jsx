import { useLayoutEffect, useRef } from "react";
import { LIMITS } from "../lib/clientId";
// Rail logo hidden for now (see the commented-out .lnav-head below).
// import { Logo } from "../assets/globalAssets";
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

// The rail's icons sit on the workspace's own lines: the toggle centred on
// the toolbar row (Grid / view switch), the last brand centred on the bottom
// row (the composer). Measured, since both rows' sizes follow the viewport and
// several stylesheets; exposed as --lnav-line-top / --lnav-line-bottom (each
// row's centre, from the rail's top / bottom edge) for layout.css.
function useWorkspaceLines(rootRef) {
  useLayoutEffect(() => {
    const rail = rootRef.current;
    if (!rail) return undefined;
    let frame = 0;
    const centre = (el) => {
      const box = el.getBoundingClientRect();
      return box.height ? box.top + box.height / 2 : null;
    };
    const measure = () => {
      frame = 0;
      const box = rail.getBoundingClientRect();
      const top = document.querySelector(".ws-topbar-start");
      const bottom = document.querySelector(".ws-tray > :last-child");
      const topY = top && centre(top);
      const bottomY = bottom && centre(bottom);
      if (topY != null) rail.style.setProperty("--lnav-line-top", `${topY - box.top}px`);
      else rail.style.removeProperty("--lnav-line-top");
      if (bottomY != null) rail.style.setProperty("--lnav-line-bottom", `${box.bottom - bottomY}px`);
      else rail.style.removeProperty("--lnav-line-bottom");
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    document.fonts?.ready.then(schedule);
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (observer) {
      observer.observe(rail);
      [".workspace", ".ws-topbar", ".ws-tray"].forEach((sel) => {
        const el = document.querySelector(sel);
        if (el) observer.observe(el);
      });
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [rootRef]);
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
  open, drawer, closeInHead = false, onToggle, brands, brandsLoaded = true, currentId, onSelect, onNew, user, onLogin, onSignup, onProfile, onUsage, usage,
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
  useWorkspaceLines(rootRef);

  const addRow = (
    <Row
      order={3}
      className={"lnav-add" + (empty ? " is-centred" : "")}
      title={tip("Add brand")}
      onClick={() => onNew("regular")}
      icon={
        // Same glyph box as Minimize's icon (its square spans 3.5–20.5), so
        // the two sit centred in their slots at the same size.
        <svg className="lnav-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17" /></svg>
      }
      label="Add Brand"
      fit
    />
  );

  return (
    <aside className="lnav" ref={rootRef} data-open={open} aria-label="Workspace navigation">
      {/* Logo + product name: hidden for now (the open/close toggle starts
          the rail instead).
      <div className="lnav-head">
        <span className="lnav-slot">
          <span className="lnav-logo"><img src={Logo} alt="" /></span>
        </span>
        <span className="lnav-label lnav-title rail-product-name" style={labelOrder(0)} data-fit>Coherence Content<br />Orchestration</span>
      </div>
      */}

      {/* Top: the open/close toggle, then the profile and credits used, side
          by side in the column. */}
      <div className="lnav-top">
      {/* Phones: no close control at all; the drawer closes by tapping the
          scrim beside it (or Escape). */}
      {!closeInHead && <Row
        order={0}
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
        label="Minimize"
        fit
      />}

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
