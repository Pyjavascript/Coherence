import { useEffect, useState } from "react";
import NodeHeader from "./NodeHeader";
import NodeActions from "./NodeActions";
import NodeContent from "./NodeContent";

// Normalises the per-medium item shapes returned by services/ai into {headline, sub}.
export function toDisplay(item) {
  if (item == null) return null;
  if (typeof item === "string") return { headline: item, sub: "" };
  return { headline: item.headline || item.subject || "", sub: item.sub || item.preview || "" };
}

const countWords = (d) => (d ? `${d.headline} ${d.sub}`.trim().split(/\s+/).filter(Boolean).length : 0);

// node = { id, type, status, items, version, message, width }
export default function NodeCard({ node, meta, regenDisabled, regenTitle, onRegenerate, onCopy, onDuplicate, onDelete }) {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => setIdx(0), [node.version]);

  const item = toDisplay(node.items[idx] ?? node.items[0]);
  const busy = node.status === "loading";
  const canCopy = !busy && Boolean(item);

  return (
    <article
      className={"ncard" + (node.width === "full" ? " is-full" : "") + (leaving ? " is-leaving" : "")}
      data-flip-id={node.id}
      data-type={node.type}
      style={{ "--node-color": meta.color }}
      aria-label={`${meta.label} node`}
      onAnimationEnd={(e) => { if (leaving && e.animationName === "ncard-out") onDelete(); }}
    >
      <NodeHeader meta={meta} wordCount={busy ? 0 : countWords(item)}>
        <NodeActions
          label={meta.label}
          busy={busy}
          canCopy={canCopy}
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
        status={node.status}
        item={item}
        version={node.version}
        message={node.message}
        onRetry={onRegenerate}
      />
      {!busy && node.items.length > 1 && (
        <div className="ncard-vtabs" role="tablist" aria-label={`${meta.label} variants`}>
          {node.items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              className={"ncard-vtab" + (i === idx ? " on" : "")}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
