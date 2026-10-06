import { useEffect, useRef, useState } from "react";
import { LIMITS } from "../lib/clientId";

function BrandGroup({ items, currentId, onSelect, onNew, collapsed }) {
  return (
    <section className="rail-group">
      {/* {!collapsed && (
        <div className="rail-head">
          <span className="lbl">Brands</span>
          <button type="button" className="rail-new" title="New brand" onClick={onNew}>+</button>
        </div>
      )} */}
      <div className="rail-items">
        {items.map((brand) => (
          <button
            key={brand.id}
            type="button"
            title={collapsed ? (brand.name || "Untitled") : undefined}
            className={"rail-item" + (brand.id === currentId ? " active" : "")}
            onClick={() => onSelect(brand.id)}
          >
            {brand.logo ? (
              <img src={brand.logo} alt="" className="rail-brand-avatar" />
            ) : (
              <span className="rail-brand-avatar rail-brand-fallback" style={{ "--brand-color": brand.color || "#373c9b" }}>
                {(brand.name || "B").trim().charAt(0).toUpperCase()}
              </span>
            )}
            {!collapsed && <span>{brand.name || "Untitled"}</span>}
          </button>
        ))}
        {/* {!items.length && !collapsed && (
          <div className="rail-empty">No saved brands yet.</div>
        )} */}
      </div>
    </section>
  );
}

export default function BrandSidebar({
  brands, currentId, onSelect, onNew, user, onLogin, onLogout, usage, model,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (footerRef.current && !footerRef.current.contains(event.target)) {
        setProfileOpen(false);
        setUsageOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generationsUsed = Math.min(LIMITS.generations, Math.max(0, usage?.generations || 0));
  const generationsLeft = LIMITS.generations - generationsUsed;
  const usagePercent = Math.round((generationsUsed / LIMITS.generations) * 100);
  const progress = (generationsUsed / LIMITS.generations) * 100;

  const toggleProfile = () => {
    setCollapsed(false);
    setUsageOpen(false);
    setProfileOpen((open) => !open);
  };

  const toggleUsage = () => {
    setCollapsed(false);
    setProfileOpen(false);
    setUsageOpen((open) => !open);
  };

  return (
    <aside className={"rail" + (collapsed ? " collapsed" : "")}>
      <div className="rail-top">
        <div className="rail-brand">
          <div className="rail-logo" aria-hidden="true">C</div>
          {!collapsed && <span className="rail-product-name">Coherence Content<br />Orchestration</span>}
          <button
            type="button"
            className="rail-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
              <path d={collapsed ? "M9 4v16" : "M15 4v16"} />
            </svg>
          </button>
        </div>

        <button
          type="button"
          className="rail-add-brand"
          onClick={() => onNew("regular")}
          title="Add brand"
        >
          <span className="rail-add-icon" aria-hidden="true">+</span>
          {!collapsed && <span>Add Brand</span>}
        </button>
      </div>

      <nav className="rail-brands" aria-label="Brands">
        <BrandGroup items={brands} currentId={currentId} onSelect={onSelect} onNew={() => onNew("regular")} collapsed={collapsed} />
      </nav>

      <div className="rail-footer" ref={footerRef}>
        {profileOpen && user && (
          <div className="rail-account-card">
            <p className="rail-card-caption">Signed in as</p>
            <p className="rail-card-email" title={user.email}>{user.email}</p>
            <hr className="rail-card-divider" />
            <button type="button" className="rail-logout" onClick={onLogout}>Log out</button>
          </div>
        )}
        {usageOpen && (
          <div className="rail-usage-card">
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
          <div className="user-profile">
            <button
              type="button"
              className="rail-footer-action"
              onClick={toggleProfile}
              title={collapsed ? "Profile" : user.email}
            >
              <span className="rail-footer-icon rail-profile-avatar">{user.email.charAt(0).toUpperCase()}</span>
              {!collapsed && <span>Profile</span>}
            </button>
          </div>
        ) : (
          <button type="button" className="rail-footer-action" onClick={() => { setCollapsed(false); onLogin(); }} title={collapsed ? "Profile" : "Log in"}>
            <span className="rail-footer-icon">?</span>
            {!collapsed && <span>Profile</span>}
          </button>
        )}
        <button
          type="button"
          className="rail-footer-action rail-credits"
          onClick={toggleUsage}
          aria-expanded={usageOpen}
          aria-label={`Credits used: ${usagePercent}%`}
        >
          <span
            className="rail-credits-meter"
            style={{ "--credits-progress": `${progress}%` }}
            data-percent={`${usagePercent}%`}
            aria-label={`${usagePercent}% of daily credits used`}
          />
          {!collapsed && <span>Credits used</span>}
        </button>
      </div>
    </aside>
  );
}
