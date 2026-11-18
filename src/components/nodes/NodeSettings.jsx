import { useId } from "react";
import WordsRange from "../WordsRange";
import Select from "../Select";
import AutoTextarea from "../AutoTextarea";
import { WEBSITE_COMPONENTS, PLATFORMS } from "../../lib/constants";
import { fieldMaxWords, fieldMinWords } from "../../lib/copyItems";
import { fieldPlaceholders } from "../../lib/placeholders";

const COMPONENT_OPTIONS = Object.entries(WEBSITE_COMPONENTS).map(([value, c]) => ({ value, label: c.label }));
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: p }));
const WORD_LABELS = { headline: "Target Heading Words", sub: "Target Description Words" };

// A Quick Grid card's settings, shown in the card in place of its copy (the
// pencil beside the title), like a Node Studio node's: job requirement,
// component (Website) and target words, with the same controls. They feed the next Generate / Regenerate for this card.
export default function NodeSettings({ id, node, meta, limits, onSetting, onWordsChange }) {
  const uid = useId();
  const isWebsite = node.type === "website";

  return (
    <div id={id} className="ncard-body ncard-settings" role="group" aria-label={`${meta.label} settings`}>
      <div className="sn-field">
        <label htmlFor={`${uid}-brief`}>Job Requirement</label>
        <AutoTextarea
          id={`${uid}-brief`}
          placeholder={fieldPlaceholders(node.type).job}
          value={node.brief}
          onChange={(e) => onSetting("brief", e.target.value)}
        />
      </div>

      {/* Social: the platform it's written for, as on a Social node. */}
      {node.type === "marketing" && (
        <div className="sn-field">
          <label>Platform</label>
          <Select label="Platform" value={node.platform || PLATFORMS[0]} options={PLATFORM_OPTIONS} onChange={(value) => onSetting("platform", value)} />
        </div>
      )}

      {isWebsite && (
        <>
          <div className="sn-field">
            <label>Component</label>
            <Select label="Component" value={node.component} options={COMPONENT_OPTIONS} onChange={(value) => onSetting("component", value)} />
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
        </>
      )}

      {/* One slider per field: the heading, and the description only when the
          medium has one (a single-line medium shows just "Target Words"). */}
      {onWordsChange && limits && Object.keys(limits).map((key) => (
        <div className="sn-field" key={key}>
          <WordsRange
            id={`${uid}-words-${key}`}
            label={limits.sub ? WORD_LABELS[key] : "Target Words"}
            value={limits[key].words}
            min={fieldMinWords(key)}
            max={fieldMaxWords(limits, key)}
            onChange={(value) => onWordsChange(key, value)}
          />
        </div>
      ))}
    </div>
  );
}
