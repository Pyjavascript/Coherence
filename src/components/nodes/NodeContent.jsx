import EditableText from "../EditableText";
import CopyLayout from "../CopyLayout";
import { GRID_DESC_FIELDS, descCount } from "../../lib/layouts";

const countWords = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

// A medium with a heading and a description (email, website, advertising):
// the card's layout tile (lib/layouts.js) drawn in its proportions. The first
// box is the heading; the others are descriptions ("sub", then "sub2"), each
// with its own word count at the bottom-left. The banned-words check (footer)
// sits in the biggest description box.
// meta.limits are the card's per-box limits (copyItems boxLimits).
function SplitContent({ meta, status, item, version, onEdit, footer, layout }) {
  const labels = meta.limits || {};
  const busy = status === "loading";
  const edit = busy || !onEdit ? undefined : onEdit;
  const fields = ["headline", ...GRID_DESC_FIELDS.slice(0, descCount(layout))];
  // A second description written for another layout, while this one has a
  // single description box: shown under the first, so nothing is hidden.
  const extra = item && fields.length < 3 && item.sub2 ? "sub2" : null;
  const state = item ? " is-generated" + (busy ? " is-refreshing" : "") : "";
  let footerUsed = false;

  const renderBox = (i, box, style) => {
    const field = fields[i];
    const head = i === 0;
    const className = "ncard-body " + (head ? "ncard-body-head" : "ncard-body-desc") + (box.large ? " is-large" : "") + state;
    const target = labels[field]?.words;

    if (busy && !item) {
      return (
        <div key={field} className={className} style={style}>
          {head ? <div className="ncard-skel w70" /> : (
            <>
              <div className="ncard-skel" />
              {box.large && <div className="ncard-skel" />}
              <div className="ncard-skel w40" />
            </>
          )}
        </div>
      );
    }

    if (!item) {
      return (
        <div key={field} className={className} style={style}>
          <p className={(head ? "ncard-headline" : "ncard-sub") + " ncard-placeholder"}>
            {head ? "Generated heading" : "Generated description appears here"}
          </p>
          {!head && target ? <div className="ncard-words">{target} words</div> : null}
        </div>
      );
    }

    const shown = [field, ...(!head && field === "sub" && extra ? [extra] : [])];
    const words = shown.reduce((n, f) => n + countWords(item[f]), 0);
    const withFooter = !head && box.large && !footerUsed;
    if (withFooter) footerUsed = true;
    return (
      <div key={field} className={className} style={style}>
        <div className="ncard-copy" key={version}>
          {shown.map((f) => (item[f] ? (
            <EditableText
              key={f}
              className={head ? "ncard-headline" : "ncard-sub"}
              value={item[f]}
              label={`${meta.label} ${labels[f]?.label || (head ? "headline" : "description")}`}
              onCommit={edit && ((text) => edit(f, text))}
            />
          ) : !head ? (
            // A box this copy has nothing for yet (written for another layout).
            <p key={f} className="ncard-sub ncard-placeholder">Generate again to fill this box</p>
          ) : null))}
        </div>
        {!head && (
          <div className="ncard-words">
            {target ? `${words} / ${target} words` : `${words} words`}
          </div>
        )}
        {withFooter && footer}
      </div>
    );
  };

  return (
    <CopyLayout
      layout={layout}
      className="ncard-split"
      aria-live={item ? "polite" : undefined}
      aria-busy={busy || undefined}
      renderBox={renderBox}
    />
  );
}

// Body of a node: placeholder, skeleton, error, or the generated copy.
// `version` changes every time new content lands, re-running the fade-in.
// footer: shown under the generated copy, bottom-right (the Copy button).
// layout: the card's "Select a layout" tile (lib/layouts.js).
export default function NodeContent({ meta, status, item, version, message, onRetry, onEdit, footer, layout = 0 }) {
  // Boxes only when the backend gives this medium a description (its
  // limits have a `sub`), and, once copy is in, only if a description came back.
  const split = Boolean(meta.limits?.sub) && !(status === "error" && !item) && (!item || Boolean(item.sub));
  if (split) {
    return <SplitContent meta={meta} status={status} item={item} version={version} onEdit={onEdit} footer={footer} layout={layout} />;
  }

  if (status === "loading" && !item) {
    return (
      <div className="ncard-body" aria-busy="true">
        <div className="ncard-skel w70" />
        <div className="ncard-skel" />
        <div className="ncard-skel w40" />
      </div>
    );
  }

  if (status === "error" && !item) {
    return (
      <div className="ncard-body is-error" role="status">
        <p>{message || "Couldn't generate — try again."}</p>
        <button type="button" className="ncard-retry" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="ncard-body">
        {/* The same line as an empty Node Studio node, in the headline's style. */}
        <p className="ncard-headline ncard-placeholder">Generated copy<br />appears here</p>
      </div>
    );
  }

  const busy = status === "loading";

  const edit = busy || !onEdit ? undefined : onEdit;
  const labels = meta.limits || {};

  return (
    <div className={"ncard-body is-generated" + (busy ? " is-refreshing" : "")} aria-live="polite" aria-busy={busy}>
      <div className="ncard-copy" key={version}>
        <EditableText
          className="ncard-headline"
          value={item.headline}
          label={`${meta.label} ${labels.headline?.label || "headline"}`}
          onCommit={edit && ((text) => edit("headline", text))}
        />
        {item.sub ? (
          <EditableText
            className="ncard-sub"
            value={item.sub}
            label={`${meta.label} ${labels.sub?.label || "supporting line"}`}
            onCommit={edit && ((text) => edit("sub", text))}
          />
        ) : null}
      </div>
      {footer}
    </div>
  );
}
