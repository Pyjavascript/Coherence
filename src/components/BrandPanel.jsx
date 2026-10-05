import { useState } from "react";
import {
  INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS,
} from "../lib/constants";

const Opts = ({ list }) => list.map((o) => <option key={o}>{o}</option>);

export default function BrandPanel({
  brand, onField, stylePack, onStylePack, variantCount, onVariantCount,
  researchCount, onSave, onDelete, onResearch, onCoherence, onHook,
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const bind = (k) => ({ value: brand[k], onChange: (e) => onField(k, e.target.value) });

  return (
    <aside className="inspector">
      <div className="sec">
        <div className="sec-head"><span className="lbl">Brand core</span></div>
        <div className="field"><label>Brand name</label><input type="text" placeholder="e.g. Ferox Parfums" {...bind("name")} /></div>
        <div className="field"><label>Core belief (the constant)</label><textarea placeholder="e.g. Scent is memory, not marketing." {...bind("belief")} /></div>
        <div className="field"><label>Message to adapt</label><textarea placeholder="e.g. Our new fragrance is built around bergamot, cedar and musk." {...bind("message")} /></div>
        <div className="field">
          <label>Industry category <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>— Pixels layer</span></label>
          <select {...bind("industry")}>
            {Object.entries(INDUSTRY_LAYERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="btnrow">
          <button className="ghost" onClick={onSave}>Save brand</button>
          <button className="ghost danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="sec">
        <div className="sec-head"><span className="lbl">Customer context</span></div>
        <div className="rowgap">
          <div className="field"><label>Funnel stage</label><select {...bind("stage")}><Opts list={FUNNEL_STAGES} /></select></div>
          <div className="field"><label>Language mode</label><select {...bind("mode")}><Opts list={TONE_MODES} /></select></div>
        </div>
        <div className="field"><label>Audience posture</label><select {...bind("audience")}><Opts list={AUDIENCES} /></select></div>
      </div>

      <div className="sec">
        <div className="sec-head"><span className="lbl">Style &amp; output</span></div>
        <div className="rowgap">
          <div className="field">
            <label>Style pack</label>
            <select value={stylePack} onChange={(e) => onStylePack(e.target.value)}>
              {Object.entries(STYLE_PACKS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}{k === "classic" ? "" : " 🔒"}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Variants / medium</label>
            <select value={variantCount} onChange={(e) => onVariantCount(parseInt(e.target.value, 10))}>
              <option value={1}>1</option><option value={2}>2 🔒</option><option value={3}>3 🔒</option>
            </select>
          </div>
        </div>
        <div className="lockhint">🔒 Style packs and multiple variants are Premium.</div>
      </div>

      <div className="sec">
        <div className="sec-head toggle" onClick={() => setAdvOpen((o) => !o)}>
          <span className="lbl">Advanced behaviour</span>
          <span className={"chev" + (advOpen ? " open" : "")}>›</span>
        </div>
        {advOpen && (
          <div className="advbody">
            <div className="field"><label>Customer pain point / trigger</label><textarea placeholder="What's bothering them right before this moment?" {...bind("pain")} /></div>
            <div className="rowgap">
              <div className="field"><label>Desired emotion</label><select {...bind("emo")}><Opts list={EMOTIONS} /></select></div>
              <div className="field"><label>Formality</label><select {...bind("formality")}><Opts list={FORMALITIES} /></select></div>
            </div>
            <div className="field"><label>Objection to pre-empt</label><textarea placeholder="e.g. Worried it won't last through the day" {...bind("objection")} /></div>
            <div className="rowgap">
              <div className="field"><label>CTA intensity</label><select {...bind("cta")}><Opts list={CTA_LEVELS} /></select></div>
              <div className="field"><label>Avoid words/claims</label><input type="text" placeholder="e.g. cheap, best-ever" {...bind("banned")} /></div>
            </div>
            <div className="field"><label>Must-include keywords</label><input type="text" placeholder="e.g. cruelty-free, small-batch" {...bind("must")} /></div>
          </div>
        )}
      </div>

      <div className="sec">
        <button className="ghost block" onClick={onResearch}>
          <span>Research notes</span><span className="mono">{researchCount}</span>
        </button>
      </div>

      <div className="sec">
        <div className="sec-head"><span className="lbl">External AI</span></div>
        <div className="field" style={{ marginBottom: ".6rem" }}><label>CTA ↔ copy coherence check</label></div>
        <button className="ghost block" style={{ marginBottom: 0 }} onClick={onCoherence}>
          <span>Copy prompt for ChatGPT / other LLM</span><span className="mono">↗</span>
        </button>
      </div>

      <div className="sec" style={{ borderBottom: "none" }}>
        <div className="sec-head"><span className="lbl">Bonus</span></div>
        <div className="field" style={{ marginBottom: ".6rem" }}><label>Hook generator — one decisive line from a plain-language brief</label></div>
        <button className="ghost block" style={{ marginBottom: 0 }} onClick={onHook}>
          <span>✨ Generate a hook</span><span className="mono">↗</span>
        </button>
      </div>
    </aside>
  );
}
