// Click-to-edit text for generated copy (a Quick Grid card's or a Node Studio
// node's heading / description). Click it to edit; Enter or clicking away
// saves, Esc cancels. Copy and the Export download then use the edited text.
// Remounts (key) whenever the committed value changes, so React never
// reconciles against DOM the browser edited.
// as: the element to render (p, h3…). Without onCommit it's plain text.
export default function EditableText({ as: Tag = "p", className = "", value, label, onCommit }) {
  if (!onCommit) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      key={value}
      className={(className ? className + " " : "") + "is-editable"}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={`Edit ${label}`}
      tabIndex={0}
      title="Click to edit · Enter to save · Esc to cancel"
      // Clicks and drags inside the text select / place the caret; they
      // mustn't start a canvas pan or a node drag.
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Keep Enter/Esc here: they shouldn't also trigger app shortcuts (Ctrl+Enter = Generate).
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = e.currentTarget.textContent.replace(/\s+/g, " ").trim();
        if (!next) e.currentTarget.textContent = value;
        else if (next !== value) onCommit(next);
      }}
    >
      {value}
    </Tag>
  );
}
