import { LIMITS } from "../lib/clientId";
import { Logo } from "../assets/globalAssets";
import { profileOf } from "./ProfileModal";
import BrandMark from "./BrandMark";
import { useCountUp } from "../hooks/useCountUp";

// Labels fade in one after another when the sidebar opens; --pl-li is a
// label's place in that sequence (capped, so long brand lists don't lag).
const labelOrder = (i) => ({ "--pl-li": Math.min(i, 8) });

// Every row is [fixed 40px icon slot][label]. The icon slot never moves, so
// only the labels fade/slide when the sidebar expands or collapses.
function Row({ as: Tag = "button", className = "", icon, label, order = 0, ...rest }) {
  return (
    <Tag type={Tag === "button" ? "button" : undefined} className={"lnav-row " + className} {...rest}>
      <span className="lnav-slot">{icon}</span>
      <span className="lnav-label" style={labelOrder(order)}>{label}</span>
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
  open, drawer, onToggle, brands, currentId, onSelect, onNew, user, onLogin, onSignup, onProfile, onUsage, usage,
}) {
  const generationsUsed = Math.min(LIMITS.generations, Math.max(0, usage?.generations || 0));
  const usagePercent = Math.round((generationsUsed / LIMITS.generations) * 100);
  // The ring's number counts up whenever usage changes.
  const shownPercent = useCountUp(usagePercent, 720);
  const tip = (text) => (open ? undefined : text);
  const profile = user ? profileOf(user) : null;
  const footerOrder = 3 + brands.length;

  return (
    <aside className="lnav" data-open={open} aria-label="Workspace navigation">
      <div className="lnav-head">
        <span className="lnav-slot">
          <span className="lnav-logo"><img src={Logo} alt="" /></span>
        </span>
        <span className="lnav-label lnav-title rail-product-name" style={labelOrder(0)}>Coherence Content<br />Orchestration</span>
      </div>

      <Row
        order={1}
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
      />

      <Row
        order={2}
        className="lnav-add"
        title={tip("Add brand")}
        onClick={() => onNew("regular")}
        icon={<span className="lnav-plus" aria-hidden="true">+</span>}
        label="Add Brand"
      />

      <nav className="lnav-brands" aria-label="Brands">
        <div className="lnav-brand-list">
        {brands.map((brand, i) => (
          <Row
            key={brand.id}
            order={3 + i}
            className={"lnav-item" + (brand.id === currentId ? " is-active" : "")}
            aria-current={brand.id === currentId ? "true" : undefined}
            title={tip(brand.name || "Untitled")}
            onClick={() => onSelect(brand.id)}
            icon={
              brand.logo ? (
                <span className="lnav-avatar"><img src={brand.logo} alt="" /></span>
              ) : (
                <span className="lnav-avatar lnav-avatar-fallback"><BrandMark brand={brand} /></span>
              )
            }
            label={brand.name || "Untitled"}
          />
        ))}
        </div>
      </nav>

      <div className="lnav-footer">
        {user ? (
          <Row
            order={footerOrder}
            title={tip(profile.displayName || user.email)}
            aria-haspopup="dialog"
            onClick={onProfile}
            icon={<ProfileIcon src={profile.avatar} />}
            label={profile.displayName || user.email}
          />
        ) : (
          <Row order={footerOrder} title={tip("Log in")} onClick={onLogin} icon={<ProfileIcon />} label="Log in" />
        )}
        <Row
          order={footerOrder + 1}
          className="rail-credits"
          aria-haspopup={user ? "dialog" : undefined}
          aria-label={`Credits used: ${usagePercent}%`}
          title={tip(`Credits used: ${usagePercent}%`)}
          onClick={user ? onUsage : onSignup}
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
        />
      </div>
    </aside>
  );
}
