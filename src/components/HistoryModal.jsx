import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { getGenerations } from "../services/brands";
import { MEDIA_BY_KEY, NODE_CATS } from "../lib/constants";
import { itemToText } from "../lib/copyItems";
import { useCopyFeedback } from "../hooks/useCopyFeedback";

const mediumMeta = (medium) => {
  if (MEDIA_BY_KEY[medium]) return { label: MEDIA_BY_KEY[medium].label, color: MEDIA_BY_KEY[medium].color, quick: true };
  const cat = String(medium || "").replace(/^node-/, "");
  const node = NODE_CATS[cat];
  return { label: node ? `${node.label} (Studio)` : medium, color: node?.color || "#84848d", quick: false };
};

function timeAgo(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const asItems = (output) => (Array.isArray(output) ? output : output ? [output] : []);

function Entry({ entry, onCopy, onRestore }) {
  const [copied, flashCopied] = useCopyFeedback();
  const meta = mediumMeta(entry.medium);
  const items = asItems(entry.output);
  const context = entry.input_context?.message || entry.input_context?.brief || "";
  const text = items.map(itemToText).filter(Boolean).join("\n\n— — —\n\n");

  return (
    <article className="history-entry" style={{ "--node-color": meta.color }}>
      <header className="history-entry-head">
        <span className="history-pill"><i aria-hidden="true" />{meta.label}</span>
        <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString()}>{timeAgo(entry.created_at)}</time>
      </header>
      {context && <p className="history-context">“{context}”</p>}
      <div className="history-items">
        {items.slice(0, 3).map((item, i) => (
          <p key={i} className="history-item">{itemToText(item)}</p>
        ))}
        {items.length > 3 && <p className="history-more">+{items.length - 3} more variant{items.length - 3 === 1 ? "" : "s"}</p>}
      </div>
      <div className="history-actions">
        <button type="button" disabled={!text} onClick={async () => { if (await onCopy(text)) flashCopied(); }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        {meta.quick && (
          <button type="button" className="is-primary" onClick={() => onRestore(entry.medium, items)}>
            Restore to grid
          </button>
        )}
      </div>
    </article>
  );
}

export default function HistoryModal({ brandId, brandName, onCopy, onRestore, onClose }) {
  const [state, setState] = useState({ status: "loading", rows: [] });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let live = true;
    getGenerations(brandId)
      .then((rows) => { if (live) setState({ status: "ready", rows }); })
      .catch(() => { if (live) setState({ status: "error", rows: [] }); });
    return () => { live = false; };
  }, [brandId]);

  const mediums = useMemo(() => [...new Set(state.rows.map((r) => r.medium))], [state.rows]);
  const rows = filter === "all" ? state.rows : state.rows.filter((r) => r.medium === filter);

  return (
    <Modal title="History" onClose={onClose} modalClassName="research-modal history-modal">
      <p className="hook-description">Everything generated for {brandName || "this brand"}, newest first.</p>
      {mediums.length > 1 && (
        <div className="history-filters" role="group" aria-label="Filter by medium">
          {["all", ...mediums].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={filter === m}
              className={filter === m ? "on" : ""}
              onClick={() => setFilter(m)}
            >
              {m === "all" ? "All" : mediumMeta(m).label}
            </button>
          ))}
        </div>
      )}
      <div className="history-list research-panel">
        {state.status === "loading" && (
          <div className="history-empty"><div className="ncard-skel w70" /><div className="ncard-skel" /><div className="ncard-skel w40" /></div>
        )}
        {state.status === "error" && <div className="history-empty">Couldn't load history. Try again in a moment.</div>}
        {state.status === "ready" && rows.length === 0 && (
          <div className="history-empty">Nothing generated for this brand yet. Generate once and it will show up here.</div>
        )}
        {rows.map((entry) => (
          <Entry key={entry.id} entry={entry} onCopy={onCopy} onRestore={onRestore} />
        ))}
      </div>
    </Modal>
  );
}
