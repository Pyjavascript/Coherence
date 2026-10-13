import { useState } from "react";
import { NOTE_TYPES } from "@web/lib/constants.js";
import type { Note } from "../hooks/useBrandData";

interface Props {
  notes: Note[];
  selectionText: string;
  onAdd: (type: string, text: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}

// The brand's research notes (shared with the web app). The first 8 go into
// every generation prompt, exactly as in the web app.
export default function ResearchTab({ notes, selectionText, onAdd, onRemove }: Props) {
  const [type, setType] = useState<string>(NOTE_TYPES[0]);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!text.trim() || adding) return;
    setAdding(true);
    if (await onAdd(type, text)) setText("");
    setAdding(false);
  };

  return (
    <section className="tab-body" aria-label="Research">
      <p className="muted small">
        Notes are saved to this brand and shared with the web app. The first 8 are added to every generation.
      </p>

      <div className="note-form">
        <select aria-label="Note type" value={type} onChange={(e) => setType(e.target.value)}>
          {NOTE_TYPES.map((t: string) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <textarea
          aria-label="Note"
          rows={3}
          maxLength={2000}
          placeholder="A competitor line, a customer quote, a trend, a keyword…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <button
            type="button"
            className="btn btn-small"
            disabled={!selectionText.trim()}
            onClick={() => setText(selectionText.slice(0, 2000))}
            title="Fill the note with the selected text layers"
          >
            Use selected text
          </button>
          <span className="grow" />
          <button type="button" className="btn btn-small btn-primary" onClick={add} disabled={!text.trim() || adding}>
            {adding ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="empty muted small">No research notes for this brand yet.</p>
      ) : (
        <ul className="notes">
          {notes.map((n, i) => (
            <li key={n.id} className={"note" + (i >= 8 ? " is-unused" : "")}>
              <span className="note-type mono">{n.type}</span>
              <p>{n.text}</p>
              <button type="button" className="note-remove" aria-label="Delete note" onClick={() => onRemove(n.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
