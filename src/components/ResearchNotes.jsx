import { useState } from "react";
import { Modal } from "./Modal";
import { NOTE_TYPES } from "../lib/constants";

export default function ResearchNotes({ notes, onAdd, onDelete, onClose }) {
  const [type, setType] = useState(NOTE_TYPES[0]);
  const [text, setText] = useState("");

  const add = async () => {
    if (!text.trim()) return;
    await onAdd(type, text);
    setText("");
  };

  return (
    <Modal title="Research notes" onClose={onClose}>
      <div className="modal-add">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a competitor line, review quote, trend, or keyword…" />
        <button className="btn-primary-sm" onClick={add}>Add note</button>
      </div>
      <div className="modal-list">
        {notes.length === 0 ? (
          <div className="empty">No research notes yet for this brand.</div>
        ) : (
          notes.map((n) => (
            <div className="note" key={n.id}>
              <span className="ntag">{n.type}</span>
              {n.text}
              <button className="ndel" onClick={() => onDelete(n.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
