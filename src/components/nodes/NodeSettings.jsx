import { useEffect, useId, useState } from "react";
import { WEBSITE_COMPONENTS } from "../../lib/constants";
import { defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";
import { fieldPlaceholders } from "../../lib/placeholders";

// Number field that saves on Enter / blur (Esc cancels), like the header's word box.
function WordsField({ id, value, min, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (draft.trim() && Number.isFinite(n) && n !== value) onCommit(n);
    setDraft(String(value));
  };
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={MAX_WORDS}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Keep Enter/Esc here: they shouldn't also trigger app shortcuts (Ctrl+Enter = Generate).
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(String(value));
        }
      }}
    />
  );
}

// A Quick Grid card's settings — the same fields as a Node Studio node: job
// requirement, component (Website), target words and specific requirements.
// They feed the next Generate / Regenerate for this card.
export default function NodeSettings({ node, meta, limits, onSetting, onWordsChange, onReset, onDone }) {
  const uid = useId();
  const isWebsite = node.type === "website";
  const custom = node.words != null || node.brief || node.requirements || (isWebsite && node.component !== "hero");

  return (
    <div className="ncard-body ncard-settings" role="group" aria-label={`${meta.label} settings`}>
      <div className="sn-field">
        <label htmlFor={`${uid}-brief`}>Job Requirement</label>
        <textarea
          id={`${uid}-brief`}
          rows={2}
          placeholder={fieldPlaceholders(node.type).job}
          value={node.brief}
          onChange={(e) => onSetting("brief", e.target.value)}
        />
      </div>

      {isWebsite && (
        <div className={node.component === "pointers" ? "sn-row2" : undefined}>
          <div className="sn-field">
            <label htmlFor={`${uid}-component`}>Component</label>
            <select id={`${uid}-component`} value={node.component} onChange={(e) => onSetting("component", e.target.value)}>
              {Object.entries(WEBSITE_COMPONENTS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </div>
          {node.component === "pointers" && (
            <div className="sn-field">
              <label htmlFor={`${uid}-pointers`}>How many pointers</label>
              <input
                id={`${uid}-pointers`}
                type="number"
                min="2"
                max="6"
                value={node.pointerCount}
                onChange={(e) => onSetting("pointerCount", Math.max(2, Math.min(6, parseInt(e.target.value, 10) || 3)))}
              />
            </div>
          )}
        </div>
      )}

      <div className="sn-field">
        <label htmlFor={`${uid}-words`}>Target Words</label>
        <WordsField id={`${uid}-words`} value={defaultWords(limits)} min={minWordsFor(limits)} onCommit={onWordsChange} />
      </div>

      <div className="sn-field">
        <label htmlFor={`${uid}-req`}>Specific Requirements</label>
        <textarea
          id={`${uid}-req`}
          rows={2}
          placeholder={fieldPlaceholders(node.type).req}
          value={node.requirements}
          onChange={(e) => onSetting("requirements", e.target.value)}
        />
      </div>

      <div className="ncard-settings-actions">
        <button type="button" className="ncard-settings-reset" onClick={onReset} disabled={!custom}>Reset</button>
        <button type="button" className="ncard-settings-done" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
