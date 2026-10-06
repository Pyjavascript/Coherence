import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { NOTE_TYPES } from "../lib/constants";

function NoteTypeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[NOTE_TYPES.indexOf(value)]?.focus();
  }, [open, value]);

  const choose = (noteType) => {
    onChange(noteType);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + direction + NOTE_TYPES.length) % NOTE_TYPES.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={"research-select" + (open ? " is-open" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="research-select-trigger"
        aria-label={`Research type: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{value}</span>
        <svg className="research-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 9 7 7 7-7" />
        </svg>
      </button>
      {open && (
        <ul className="research-select-list" role="listbox" aria-label="Research type" onKeyDown={onListKeyDown}>
          {NOTE_TYPES.map((noteType, index) => (
            <li key={noteType} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className="research-select-option"
                role="option"
                aria-selected={noteType === value}
                onClick={() => choose(noteType)}
              >
                <span>{noteType}</span>
                {noteType === value && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4.5 12.5 5 5L19.5 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResearchNotes({ notes, onAdd, onDelete, onClose }) {
  const [type, setType] = useState(NOTE_TYPES[0]);
  const [text, setText] = useState("");
  const notesRef = useRef(null);

  useEffect(() => {
    if (notesRef.current) notesRef.current.scrollTop = notesRef.current.scrollHeight;
  }, [notes.length]);

  const add = async () => {
    if (!text.trim()) return;
    await onAdd(type, text);
    setText("");
  };

  return (
    <Modal title="Research notes" onClose={onClose} modalClassName="research-modal">
      <div className="research-modal-content">
        <p className="research-description">Keep useful audience insights, competitor references, and ideas close to your brand.</p>
        <div className="research-panel">
          <NoteTypeSelect value={type} onChange={setType} />
          <div className="research-field">
            <textarea
              id="research-text"
              aria-label="Research note"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste a competitor line, review quote, trend, or keyword..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void add();
                }
              }}
            />
          </div>
          <button className="research-add" type="button" onClick={add} disabled={!text.trim()}>
            Add notes
          </button>
          <div className="research-notes-list" ref={notesRef} aria-label="Saved notes">
            {notes.map((note) => (
              <article className="research-note-card" key={note.id}>
                <div className="research-note-body">
                  <h3>{note.type}</h3>
                  <p>{note.text}</p>
                </div>
                <button type="button" aria-label={`Delete ${note.type} note`} onClick={() => onDelete(note.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l14 14M19 5 5 19" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
          {notes.length === 0 && <div className="research-empty">No research notes yet. Add an insight to get started.</div>}
        </div>
      </div>
    </Modal>
  );
}
