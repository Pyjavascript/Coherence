// import { useState } from "react";
// import {
//   INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS,
// } from "../lib/constants";

// const Opts = ({ list }) => list.map((o) => <option key={o}>{o}</option>);

// export default function BrandPanel({
//   brand, onField, stylePack, onStylePack, variantCount, onVariantCount,
//   researchCount, onSave, onDelete, onResearch, onCoherence, onHook,
// }) {
//   const [advOpen, setAdvOpen] = useState(false);
//   const bind = (k) => ({ value: brand[k], onChange: (e) => onField(k, e.target.value) });

//   return (
//     <aside className="inspector">
//       <div className="sec">
//         <div className="sec-head"><span className="lbl">Brand core</span></div>
//         <div className="field"><label>Brand name</label><input type="text" placeholder="e.g. Ferox Parfums" {...bind("name")} /></div>
//         <input
//           type="color"
//           className="brand-color-picker"
//           {...bind("color")}
//           title="Choose brand color"
//         />
//         <div className="field"><label>Core belief (the constant)</label><textarea placeholder="e.g. Scent is memory, not marketing." {...bind("belief")} /></div>
//         <div className="field"><label>Message to adapt</label><textarea placeholder="e.g. Our new fragrance is built around bergamot, cedar and musk." {...bind("message")} /></div>
//         <div className="field">
//           <label>Industry category <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>— Pixels layer</span></label>
//           <select {...bind("industry")}>
//             {Object.entries(INDUSTRY_LAYERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
//           </select>
//         </div>
//         <div className="btnrow">
//           <button className="ghost" onClick={onSave}>Save brand</button>
//           <button className="ghost danger" onClick={onDelete}>Delete</button>
//         </div>
//       </div>

//       <div className="sec">
//         <div className="sec-head"><span className="lbl">Customer context</span></div>
//         <div className="rowgap">
//           <div className="field"><label>Funnel stage</label><select {...bind("stage")}><Opts list={FUNNEL_STAGES} /></select></div>
//           <div className="field"><label>Language mode</label><select {...bind("mode")}><Opts list={TONE_MODES} /></select></div>
//         </div>
//         <div className="field"><label>Audience posture</label><select {...bind("audience")}><Opts list={AUDIENCES} /></select></div>
//       </div>

//       <div className="sec">
//         <div className="sec-head"><span className="lbl">Style &amp; output</span></div>
//         <div className="rowgap">
//           <div className="field">
//             <label>Style pack</label>
//             <select value={stylePack} onChange={(e) => onStylePack(e.target.value)}>
//               {Object.entries(STYLE_PACKS).map(([k, v]) => (
//                 <option key={k} value={k}>{v.label}{k === "classic" ? "" : " 🔒"}</option>
//               ))}
//             </select>
//           </div>
//           <div className="field">
//             <label>Variants / medium</label>
//             <select value={variantCount} onChange={(e) => onVariantCount(parseInt(e.target.value, 10))}>
//               <option value={1}>1</option><option value={2}>2 🔒</option><option value={3}>3 🔒</option>
//             </select>
//           </div>
//         </div>
//         <div className="lockhint">🔒 Style packs and multiple variants are Premium.</div>
//       </div>

//       <div className="sec">
//         <div className="sec-head toggle" onClick={() => setAdvOpen((o) => !o)}>
//           <span className="lbl">Advanced behaviour</span>
//           <span className={"chev" + (advOpen ? " open" : "")}>›</span>
//         </div>
//         {advOpen && (
//           <div className="advbody">
//             <div className="field"><label>Customer pain point / trigger</label><textarea placeholder="What's bothering them right before this moment?" {...bind("pain")} /></div>
//             <div className="rowgap">
//               <div className="field"><label>Desired emotion</label><select {...bind("emo")}><Opts list={EMOTIONS} /></select></div>
//               <div className="field"><label>Formality</label><select {...bind("formality")}><Opts list={FORMALITIES} /></select></div>
//             </div>
//             <div className="field"><label>Objection to pre-empt</label><textarea placeholder="e.g. Worried it won't last through the day" {...bind("objection")} /></div>
//             <div className="rowgap">
//               <div className="field"><label>CTA intensity</label><select {...bind("cta")}><Opts list={CTA_LEVELS} /></select></div>
//               <div className="field"><label>Avoid words/claims</label><input type="text" placeholder="e.g. cheap, best-ever" {...bind("banned")} /></div>
//             </div>
//             <div className="field"><label>Must-include keywords</label><input type="text" placeholder="e.g. cruelty-free, small-batch" {...bind("must")} /></div>
//           </div>
//         )}
//       </div>

//       <div className="sec">
//         <button className="ghost block" onClick={onResearch}>
//           <span>Research notes</span><span className="mono">{researchCount}</span>
//         </button>
//       </div>

//       <div className="sec">
//         <div className="sec-head"><span className="lbl">External AI</span></div>
//         <div className="field" style={{ marginBottom: ".6rem" }}><label>CTA ↔ copy coherence check</label></div>
//         <button className="ghost block" style={{ marginBottom: 0 }} onClick={onCoherence}>
//           <span>Copy prompt for ChatGPT / other LLM</span><span className="mono">↗</span>
//         </button>
//       </div>

//       <div className="sec" style={{ borderBottom: "none" }}>
//         <div className="sec-head"><span className="lbl">Bonus</span></div>
//         <div className="field" style={{ marginBottom: ".6rem" }}><label>Hook generator — one decisive line from a plain-language brief</label></div>
//         <button className="ghost block" style={{ marginBottom: 0 }} onClick={onHook}>
//           <span>✨ Generate a hook</span><span className="mono">↗</span>
//         </button>
//       </div>
//     </aside>
//   );
// }

import { useEffect, useState, useRef } from "react";
import {
  INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS,
} from "../lib/constants";

function BrandSelect({ value, onChange, options, label, premium = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  const moveFocus = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(currentIndex + direction + options.length) % options.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={"bp-dd" + (open ? " open" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="bp-dd-trigger"
        aria-label={label}
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
        {premium && (
          <svg className="bp-dd-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4.5" y="10" width="15" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        )}
        <span className="bp-dd-value">{selected?.label ?? value}</span>
        <span className="bp-dd-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 9 7 7 7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="bp-dd-menu" role="listbox" aria-label={label} onKeyDown={moveFocus}>
          {options.map((option, index) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className={"bp-dd-opt" + (option.value === value ? " selected" : "")}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <svg className="bp-dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

export default function BrandPanel({
  brand, onField, stylePack, onStylePack, variantCount, onVariantCount,
  researchCount, onSave, onDelete, onResearch, onCoherence, onHook, open, onClose,
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const fileInputRef = useRef(null);
  const bind = (k) => ({ value: brand[k] ?? "", onChange: (e) => onField(k, e.target.value) });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onField("logo", reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside
      className={"inspector canvas-inspector" + (open ? " open" : "")}
      aria-hidden={!open}
      inert={open ? undefined : ""}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="inspector-titlebar">
        <h2>{brand.name || "Untitled Brand"}</h2>
        <button type="button" aria-label="Close brand information panel" onClick={onClose}>−</button>
      </div>
      <section className="bp-section bp-section-brand">
        <h3 className="bp-section-title">Brand core</h3>
        <div className="bp-card">
          <div className="bp-field">
            <label className="bp-label">Brand Name</label>
            <div className="bp-inline bp-name-input">
              <input className="bp-input" type="text" placeholder="Write Brand name" {...bind("name")} />
              <button type="button" className="bp-addimg" onClick={() => fileInputRef.current?.click()}>
                {brand.logo ? "Change image" : "Add image"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="bp-file-input" onChange={handleImageUpload} />
            </div>
          </div>
          <div className="bp-field">
            <label className="bp-label">Core Belief</label>
            <textarea className="bp-textarea" placeholder="e.g. Scent is memory, not marketing and assume ..." {...bind("belief")} />
          </div>
          <div className="bp-field">
            <label className="bp-label">Message to adapt</label>
            <textarea className="bp-textarea" placeholder="Questions about cooperation, you will need to fill ..." {...bind("message")} />
          </div>
          <div className="bp-field">
            <div className="bp-label-row">
              <label className="bp-label">Industry Category</label>
              <span className="bp-tag">Pixel layer</span>
            </div>
            <BrandSelect
              label="Industry category"
              value={brand.industry}
              onChange={(value) => onField("industry", value)}
              options={Object.entries(INDUSTRY_LAYERS).map(([value, layer]) => ({ value, label: layer.label }))}
            />
          </div>
          <div className="bp-actions">
            <button type="button" className="bp-del" aria-label="Delete brand" onClick={onDelete}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6" />
              </svg>
            </button>
            <button type="button" className="bp-save" onClick={onSave}>Save</button>
          </div>
        </div>
      </section>

      <section className="bp-section">
        <h3 className="bp-section-title">Customer Context</h3>
        <div className="bp-card">
          <div className="bp-row2">
            <div className="bp-field">
              <label className="bp-label">Funnel Stage</label>
              <BrandSelect label="Funnel stage" value={brand.stage} onChange={(value) => onField("stage", value)} options={FUNNEL_STAGES.map((option) => ({ value: option, label: option }))} />
            </div>
            <div className="bp-field">
              <label className="bp-label">Language</label>
              <BrandSelect label="Language mode" value={brand.mode} onChange={(value) => onField("mode", value)} options={TONE_MODES.map((option) => ({ value: option, label: option }))} />
            </div>
          </div>
          <div className="bp-field">
            <label className="bp-label">Audience Posture</label>
            <BrandSelect label="Audience posture" value={brand.audience} onChange={(value) => onField("audience", value)} options={AUDIENCES.map((option) => ({ value: option, label: option }))} />
          </div>
        </div>
      </section>

      <section className="bp-section bp-section-premium">
        <div className="bp-section-title-row">
          <h3 className="bp-section-title">Style &amp; Output</h3>
          <svg className="bp-section-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4.5" y="10" width="15" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="bp-card bp-card-gold">
          <div className="bp-row2">
            <div className="bp-field">
              <label className="bp-label">Style Pack</label>
              <BrandSelect
                label="Style pack"
                premium
                value={stylePack}
                onChange={onStylePack}
                options={Object.entries(STYLE_PACKS).map(([value, pack]) => ({ value, label: `${pack.label}${value === "classic" ? "" : " 🔒"}` }))}
              />
            </div>
            <div className="bp-field">
              <label className="bp-label">Variants / medium</label>
              <BrandSelect
                label="Variants per medium"
                premium
                value={String(variantCount)}
                onChange={(value) => onVariantCount(parseInt(value, 10))}
                options={[1, 2, 3].map((value) => ({ value: String(value), label: `${value}${value === 1 ? "" : " 🔒"}` }))}
              />
            </div>
          </div>
          <p className="bp-premium-note">Style packs and multiple variants are Premium.</p>
        </div>
      </section>

      <section className="bp-section">
        <button
          type="button"
          className="bp-section-toggle"
          aria-expanded={advOpen}
          onClick={() => setAdvOpen((isOpen) => !isOpen)}
        >
          <span className="bp-section-title">Advanced behaviour</span>
          <span className={"bp-section-chevron" + (advOpen ? " open" : "")} aria-hidden="true">⌄</span>
        </button>
        {advOpen && (
          <div className="bp-card">
            <div className="bp-field"><label className="bp-label">Customer pain point / trigger</label><textarea className="bp-textarea" placeholder="What's bothering them right before this moment?" {...bind("pain")} /></div>
            <div className="bp-row2">
              <div className="bp-field"><label className="bp-label">Desired emotion</label><BrandSelect label="Desired emotion" value={brand.emo} onChange={(value) => onField("emo", value)} options={EMOTIONS.map((option) => ({ value: option, label: option }))} /></div>
              <div className="bp-field"><label className="bp-label">Formality</label><BrandSelect label="Formality" value={brand.formality} onChange={(value) => onField("formality", value)} options={FORMALITIES.map((option) => ({ value: option, label: option }))} /></div>
            </div>
            <div className="bp-field"><label className="bp-label">Objection to pre-empt</label><textarea className="bp-textarea" placeholder="e.g. Worried it won't last through the day" {...bind("objection")} /></div>
            <div className="bp-row2">
              <div className="bp-field"><label className="bp-label">CTA intensity</label><BrandSelect label="CTA intensity" value={brand.cta} onChange={(value) => onField("cta", value)} options={CTA_LEVELS.map((option) => ({ value: option, label: option }))} /></div>
              <div className="bp-field"><label className="bp-label">Avoid words / claims</label><input className="bp-input" type="text" placeholder="e.g. cheap, best-ever" {...bind("banned")} /></div>
            </div>
            <div className="bp-field"><label className="bp-label">Must-include keywords</label><input className="bp-input" type="text" placeholder="e.g. cruelty-free, small-batch" {...bind("must")} /></div>
          </div>
        )}
      </section>

      <button type="button" className="bp-research" onClick={onResearch}>
        <span>Research notes</span><b>{researchCount}</b>
      </button>

      <section className="bp-section bp-external-section">
        <h3 className="bp-section-title">External AI</h3>
        <button type="button" className="bp-copy" onClick={onCoherence}>
          Copy Prompt
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
            <path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" />
          </svg>
        </button>
      </section>

      <section className="bp-section bp-bonus-section">
        <div className="bp-card bp-card-hook">
          <div className="bp-gen-top">
            <span className="bp-gen-icon" aria-hidden="true">✦</span>
            <div><h4>Generate Free Hook.</h4><p>One available daily on free versions</p></div>
          </div>
          <button type="button" className="bp-gen-btn" onClick={onHook}>Generate</button>
        </div>
      </section>
    </aside>
  );
}