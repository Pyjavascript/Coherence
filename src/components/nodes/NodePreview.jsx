// Shows a Quick Grid item the way it would appear in the real world:
// an inbox row, a website hero, a sponsored post, a poster, a product label.
const domainOf = (name) =>
  (String(name || "yourbrand").toLowerCase().replace(/[^a-z0-9]+/g, "") || "yourbrand") + ".com";

function Avatar({ brand, size = "md" }) {
  const name = brand?.name?.trim() || "Your brand";
  return (
    <span className={"pv-avatar pv-avatar-" + size} aria-hidden="true">
      {brand?.logo ? <img src={brand.logo} alt="" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function NodePreview({ type, item, brand }) {
  const name = brand?.name?.trim() || "Your brand";

  if (type === "email") {
    return (
      <div className="pv pv-inbox" aria-label="Inbox preview">
        <div className="pv-inbox-bar"><span>Inbox</span><span className="pv-muted">Primary</span></div>
        <div className="pv-inbox-row is-new">
          <Avatar brand={brand} />
          <div className="pv-inbox-text">
            <div className="pv-inbox-top"><b>{name}</b><span className="pv-muted">now</span></div>
            <div className="pv-inbox-subject">{item.headline}</div>
            <div className="pv-inbox-preview">{item.sub}</div>
          </div>
        </div>
        <div className="pv-inbox-row pv-ghost" aria-hidden="true"><span className="pv-avatar pv-avatar-md" /><div className="pv-lines"><i /><i /></div></div>
      </div>
    );
  }

  if (type === "website") {
    return (
      <div className="pv pv-browser" aria-label="Website hero preview">
        <div className="pv-browser-bar">
          <span className="pv-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="pv-url">{domainOf(name)}</span>
        </div>
        <div className="pv-hero">
          <div className="pv-hero-nav"><Avatar brand={brand} size="sm" /><b>{name}</b></div>
          <h3>{item.headline}</h3>
          {item.sub && <p>{item.sub}</p>}
          <span className="pv-cta">Discover more</span>
        </div>
      </div>
    );
  }

  if (type === "advertising") {
    return (
      <div className="pv pv-ad" aria-label="Sponsored post preview">
        <div className="pv-ad-head">
          <Avatar brand={brand} size="sm" />
          <div><b>{name}</b><span className="pv-muted">Sponsored</span></div>
        </div>
        <div className="pv-ad-media"><span>{item.headline}</span></div>
        <div className="pv-ad-foot">
          <p>{item.sub || item.headline}</p>
          <span className="pv-cta">Learn more</span>
        </div>
      </div>
    );
  }

  if (type === "packaging") {
    return (
      <div className="pv pv-pack" aria-label="Packaging preview">
        <div className="pv-pack-box">
          <span className="pv-pack-brand">{name}</span>
          <span className="pv-pack-rule" aria-hidden="true" />
          <span className="pv-pack-line">{item.headline}</span>
        </div>
      </div>
    );
  }

  // Marketing (and anything else): a campaign poster.
  return (
    <div className="pv pv-poster" aria-label="Campaign poster preview">
      <span className="pv-poster-line">{item.headline}</span>
      {item.sub && <span className="pv-poster-sub">{item.sub}</span>}
      <span className="pv-poster-brand">{name}</span>
    </div>
  );
}
