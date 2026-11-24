import { useId } from "react";
import WordsRange from "../WordsRange";
import Select from "../Select";
import AutoTextarea from "../AutoTextarea";
import { WEBSITE_COMPONENTS, PLATFORMS } from "../../lib/constants";
import { fieldMaxWords, fieldMinWords } from "../../lib/copyItems";
import { fieldPlaceholders } from "../../lib/placeholders";
import { COPY_LAYOUTS, DEFAULT_LAYOUT } from "../../lib/layouts";

const COMPONENT_OPTIONS = Object.entries(WEBSITE_COMPONENTS).map(([value, c]) => ({ value, label: c.label }));
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: p }));
const WORD_LABELS = { headline: "Target Heading Words", sub: "Target Description Words" };

// "Select a layout": five tiles (lib/layouts.js), each drawn as its blocks
// (x, y, w, h in a 40 × 30 box), as in the design: two rows; two over one
// row; three rows (the middle one taller); one row over two; a bar over a
// block. The pick (the tile's id) is the card's `layout`: the first block is
// the heading, the rest descriptions. The last tile, "Bar over a block", is
// the default (id 0): the card as it always was. The others draw the copy
// boxes in the tile's shape and proportions.
const LAYOUTS = COPY_LAYOUTS;

// Also used by a Node Studio node's settings (NodeStudio.jsx).
export function LayoutPicker({ value = DEFAULT_LAYOUT, onChange }) {
  return (
    <div className="ncard-layouts" role="radiogroup" aria-label="Select a layout">
      {LAYOUTS.map((layout) => (
        <button
          key={layout.name}
          type="button"
          role="radio"
          aria-checked={layout.id === value}
          aria-label={layout.name}
          title={layout.name}
          className={"ncard-layout" + (layout.id === value ? " is-on" : "")}
          onClick={() => onChange(layout.id)}
        >
          <svg viewBox="0 0 40 30" aria-hidden="true">
            {layout.blocks.map(([x, y, w, h], j) => <rect key={j} x={x} y={y} width={w} height={h} rx="3" />)}
          </svg>
        </button>
      ))}
    </div>
  );
}

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

      <div className="sn-field">
        <label>Select a layout</label>
        <LayoutPicker value={node.layout ?? 0} onChange={(value) => onSetting("layout", value)} />
      </div>
    </div>
  );
}
