import { useEffect, useRef, useState } from "react";
import NodeHeader from "./NodeHeader";
import NodeActions from "./NodeActions";
import NodeContent from "./NodeContent";
import { toDisplay, measure } from "../../lib/copyItems";

// Kept for existing imports; the helper now lives in lib/copyItems.
export { toDisplay };

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

// node = { id, type, status, items, version, message, width, fav }
export default function NodeCard({
  node, meta, brand, regenDisabled, regenTitle, onRegenerate, onCopy, onDuplicate, onDelete, onEdit, onToggleFav,
}) {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fresh, setFresh] = useState(false);
  const firstVersion = useRef(node.version);

  useEffect(() => setIdx(0), [node.version]);

  // Brief glow when new copy lands (not on mount).
  useEffect(() => {
    if (node.version === firstVersion.current) return undefined;
    setFresh(true);
    const timer = window.setTimeout(() => setFresh(false), 1400);
    return () => window.clearTimeout(timer);
  }, [node.version]);

  const shown = node.items[idx] != null ? idx : 0;
  const item = toDisplay(node.items[shown]);
  const busy = node.status === "loading";
  const canCopy = !busy && Boolean(item);
  const meter = busy ? null : measure(item, meta.limits);

  return (
    <article
      className={"ncard" + (node.width === "full" ? " is-full" : "") + (leaving ? " is-leaving" : "") + (fresh ? " is-fresh" : "")}
      data-flip-id={node.id}
      data-type={node.type}
      style={{ "--node-color": meta.color }}
      aria-label={`${meta.label} node`}
      onAnimationEnd={(e) => { if (leaving && e.animationName === "ncard-out") onDelete(); }}
    >
      <NodeHeader meta={meta} meter={meter}>
        <NodeActions
          label={meta.label}
          busy={busy}
          canCopy={canCopy}
          preview={preview}
          onTogglePreview={() => setPreview((on) => !on)}
          regenDisabled={regenDisabled || leaving}
          regenTitle={regenTitle}
          onRegenerate={onRegenerate}
          onCopy={() => onCopy([item.headline, item.sub].filter(Boolean).join("\n"))}
          onDuplicate={onDuplicate}
          onDelete={() => setLeaving(true)}
        />
      </NodeHeader>
      <NodeContent
        meta={meta}
        brand={brand}
        status={node.status}
        item={item}
        version={node.version}
        message={node.message}
        preview={preview && Boolean(item)}
        onRetry={onRegenerate}
        onEdit={onEdit ? (field, text) => onEdit(shown, field, text) : undefined}
      />
      {!busy && node.items.length > 1 && (
        <div className="ncard-vtabs">
          <div className="ncard-vtabs-list" role="tablist" aria-label={`${meta.label} variants`}>
            {node.items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === shown}
                aria-label={`Variant ${i + 1}${i === node.fav ? " (favourite)" : ""}`}
                className={"ncard-vtab" + (i === shown ? " on" : "") + (i === node.fav ? " is-fav" : "")}
                onClick={() => setIdx(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {onToggleFav && (
            <button
              type="button"
              className={"ncard-fav" + (node.fav === shown ? " on" : "")}
              aria-pressed={node.fav === shown}
              title={node.fav === shown ? "Remove favourite" : "Mark as favourite — used first in Export"}
              onClick={() => onToggleFav(shown)}
            >
              <StarIcon filled={node.fav === shown} />
              <span>Favourite</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
