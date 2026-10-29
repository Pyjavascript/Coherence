import { useEffect, useRef, useState } from "react";
import NodeHeader from "./NodeHeader";
import NodeActions, { CopyButton } from "./NodeActions";
import NodeContent from "./NodeContent";
import NodeSettingsMenu from "./NodeSettingsMenu";
import BannedCheck from "./BannedCheck";
import { fieldPlaceholders } from "../../lib/placeholders";
import { WEBSITE_COMPONENTS } from "../../lib/constants";
import { toDisplay, measure, cardLimits, defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";

// Kept for existing imports; the helper now lives in lib/copyItems.
export { toDisplay };

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

// node = { id, type, status, items, version, message, width, fav, words, brief, requirements, component, pointerCount }
// span = how many of the grid's 12 tracks the card takes (QuickGrid packs them).
// enterIndex = this card's place in the grid's entrance stagger (0 = no wait).
// banned = the brand's "Never use" list; the shown copy is checked against it.
export default function NodeCard({
  node, meta, span, enterIndex = 0, skipped = false, banned, regenDisabled, regenTitle, onRegenerate, onBlocked, onCopy, onDuplicate, onDelete, onEdit, onToggleFav,
  onWordsChange, onSetting, onLabelChange,
}) {
  // The card's own title, or the medium's name while it's blank.
  const title = node.label?.trim() || meta.label;
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [fresh, setFresh] = useState(false);
  // Fixed at mount: changing the delay mid-entrance would make the card jump.
  const [enterAt] = useState(enterIndex);
  const [entering, setEntering] = useState(true);
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
  const limits = cardLimits(node.type, node);
  const cardMeta = { ...meta, limits };
  // Keep measuring the current copy while it regenerates, so the header doesn't shift.
  const meter = measure(item, limits);

  // Node Studio's fields, in Node Studio's order, for the menu beside the title.
  const settings = onSetting && [
    {
      key: "brief", label: "Job requirement", kind: "text",
      value: node.brief, display: node.brief.trim(), isSet: Boolean(node.brief.trim()),
      placeholder: fieldPlaceholders(node.type).job,
      onChange: (value) => onSetting("brief", value),
    },
    node.type === "website" && {
      key: "component", label: "Component", kind: "choice",
      value: node.component, display: WEBSITE_COMPONENTS[node.component]?.label, isSet: node.component !== "hero",
      options: Object.entries(WEBSITE_COMPONENTS).map(([key, c]) => [key, c.label]),
      onChange: (value) => onSetting("component", value),
    },
    node.type === "website" && node.component === "pointers" && {
      key: "pointerCount", label: "How many pointers", kind: "number",
      value: node.pointerCount, display: String(node.pointerCount), isSet: node.pointerCount !== 3, min: 2, max: 6,
      onChange: (value) => onSetting("pointerCount", value),
    },
    onWordsChange && {
      key: "words", label: "Target words", kind: "number",
      value: defaultWords(limits), display: String(defaultWords(limits)), isSet: node.words != null,
      min: minWordsFor(limits), max: MAX_WORDS,
      onChange: onWordsChange,
    },
    {
      key: "requirements", label: "Specific requirements", kind: "text",
      value: node.requirements, display: node.requirements.trim(), isSet: Boolean(node.requirements.trim()),
      placeholder: fieldPlaceholders(node.type).req,
      onChange: (value) => onSetting("requirements", value),
    },
  ].filter(Boolean);

  return (
    <article
      className={"ncard" + (node.width === "full" ? " is-full" : "") + (leaving ? " is-leaving" : "") + (fresh ? " is-fresh" : "")}
      data-flip-id={node.id}
      data-type={node.type}
      data-skipped={skipped || undefined}
      data-pl-enter={entering || undefined}
      style={{ "--node-color": meta.color, "--pl-i": enterAt, gridColumn: span ? `span ${span}` : undefined }}
      aria-label={`${title} card`}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.animationName === "ncard-in") setEntering(false);
        if (leaving && e.animationName === "ncard-out") onDelete();
      }}
    >
      <NodeHeader
        meta={meta}
        label={node.label ?? meta.label}
        onLabelChange={onLabelChange}
        meter={meter}
        limits={limits}
        custom={node.words != null}
        onWordsChange={onWordsChange}
        menu={settings && <NodeSettingsMenu label={title} fields={settings} />}
      >
        <NodeActions
          label={title}
          busy={busy}
          canRegenerate={node.items.length > 0}
          regenDisabled={regenDisabled || leaving}
          regenTitle={regenTitle}
          onRegenerate={onRegenerate}
          onBlocked={onBlocked}
          onDuplicate={onDuplicate}
          onDelete={() => setLeaving(true)}
          onClose={() => setLeaving(true)}
        />
      </NodeHeader>
      <NodeContent
        meta={cardMeta}
        status={node.status}
        item={item}
        version={node.version}
        message={node.message}
        onRetry={onRegenerate}
        onEdit={onEdit ? (field, text) => onEdit(shown, field, text) : undefined}
        footer={canCopy && (
          <CopyButton label={title} onCopy={() => onCopy([item.headline, item.sub].filter(Boolean).join("\n"))} />
        )}
      />
      {!busy && item && <BannedCheck copy={item} banned={banned} className="ncard-banned" />}
      {!busy && node.items.length > 1 && (
        <div className="ncard-vtabs">
          <div className="ncard-vtabs-list" role="tablist" aria-label={`${title} variants`}>
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
