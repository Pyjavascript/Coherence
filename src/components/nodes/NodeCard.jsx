import { useEffect, useRef, useState } from "react";
import NodeHeader from "./NodeHeader";
import NodeActions, { CopyButton } from "./NodeActions";
import NodeContent from "./NodeContent";
import NodeSettings from "./NodeSettings";
import BannedCheck from "./BannedCheck";
import { toDisplay, measure, cardLimits } from "../../lib/copyItems";

// Kept for existing imports; the helper now lives in lib/copyItems.
export { toDisplay };

// The settings button's icon: a pencil, as on a Node Studio node.
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L9 18.5z" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

// node = { id, type, status, items, version, message, width, fav, words, brief, component, pointerCount }
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
  // The pencil beside the title swaps the card between its copy (default) and
  // its settings, which drop down in the copy's place, like a Node Studio node.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The card's height when the settings open, kept as its minimum while they
  // show: the settings scroll inside it (enhancements.css .ncard-settings)
  // instead of the card (and its grid row) growing or shrinking.
  const cardRef = useRef(null);
  const [lockH, setLockH] = useState(null);
  const toggleSettings = () => {
    if (!settingsOpen) setLockH(cardRef.current?.offsetHeight || null);
    setSettingsOpen((open) => !open);
  };
  const bodyId = `${node.id}-body`;
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

  return (
    <article
      ref={cardRef}
      className={"ncard" + (node.width === "full" ? " is-full" : "") + (leaving ? " is-leaving" : "") + (fresh ? " is-fresh" : "") + (settingsOpen ? " is-settings" : "")}
      data-flip-id={node.id}
      data-type={node.type}
      data-skipped={skipped || undefined}
      data-pl-enter={entering || undefined}
      style={{
        "--node-color": meta.color,
        "--pl-i": enterAt,
        gridColumn: span ? `span ${span}` : undefined,
        minHeight: settingsOpen && lockH ? `${lockH}px` : undefined,
      }}
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
        menu={onSetting && (
          <button
            type="button"
            className={"ncard-sheet-trigger" + (settingsOpen ? " is-open" : "")}
            aria-pressed={settingsOpen}
            aria-controls={bodyId}
            aria-label={settingsOpen ? `Hide ${title} settings` : `Show ${title} settings`}
            title={settingsOpen ? "Hide settings" : "Settings"}
            onClick={toggleSettings}
          >
            <PencilIcon />
          </button>
        )}
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
      {settingsOpen ? (
        <NodeSettings
          id={bodyId}
          node={node}
          meta={meta}
          limits={limits}
          onSetting={onSetting}
          onWordsChange={onWordsChange}
        />
      ) : (
        <>
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
        </>
      )}
    </article>
  );
}
