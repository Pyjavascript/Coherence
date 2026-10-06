import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MODEL_OPTIONS } from "../lib/constants";

const MODEL_DESCRIPTIONS = {
  fast: "Faster for everyday tasks",
  balanced: "Best balance of speed and quality",
  quality: "Best for complex tasks",
};

function ModelSelector({ tier, onTier }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ right: false, up: false });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();
  const selectedIndex = Math.max(0, MODEL_OPTIONS.findIndex((model) => model.value === tier));
  const selected = MODEL_OPTIONS[selectedIndex];

  useLayoutEffect(() => {
    if (!open || !rootRef.current || !menuRef.current) return;
    const triggerRect = rootRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const surfaceRect = rootRef.current.closest(".canvas-surface")?.getBoundingClientRect();
    const rightBoundary = Math.min(window.innerWidth - 8, (surfaceRect?.right ?? window.innerWidth) - 8);
    setPlacement({
      right: triggerRect.left + menuRect.width > rightBoundary && triggerRect.right - menuRect.width >= 8,
      up: triggerRect.bottom + menuRect.height > window.innerHeight - 8 && triggerRect.top - menuRect.height >= 8,
    });
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

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

  const choose = (model) => {
    onTier(model.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + direction + MODEL_OPTIONS.length) % MODEL_OPTIONS.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : MODEL_OPTIONS.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={"model-selector" + (open ? " is-open" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="model-selector-trigger"
        aria-label={`Generation model: ${selected.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={selected.label}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="model-selector-logo" aria-hidden="true">✳</span>
        <svg className="model-selector-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          ref={menuRef}
          className={"model-selector-menu" + (placement.right ? " is-right" : "") + (placement.up ? " is-up" : "")}
          role="listbox"
          aria-label="Generation model"
          onKeyDown={onMenuKeyDown}
        >
          {MODEL_OPTIONS.map((model, index) => (
            <li key={model.value} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className="model-selector-option"
                role="option"
                aria-selected={model.value === tier}
                onClick={() => choose(model)}
              >
                <span className="model-selector-option-icon" aria-hidden="true">{index === 0 ? "✦" : index === 1 ? "✧" : "✷"}</span>
                <span className="model-selector-option-text">
                  <span className="model-selector-option-name">{model.label}</span>
                  <span className="model-selector-option-description">{MODEL_DESCRIPTIONS[model.value]}</span>
                </span>
                {model.value === tier && (
                  <svg className="model-selector-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

export default function Header({
  tier,
  onTier,
  onGenerate,
  generating,
  atGenLimit,
  panelOpen,
  onTogglePanel,
  onAddNode,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);

  useEffect(() => {
    const closeMenu = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <header className="canvas-topbar">
      <div className="canvas-topbar-left" ref={addMenuRef}>
        <button
          type="button"
          className="toolbar-add-node"
          aria-expanded={addMenuOpen}
          onClick={() => setAddMenuOpen((open) => !open)}
        >
          <span>Add Node</span>
          <span className="toolbar-add-spark" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
        </button>
        {addMenuOpen && (
          <div className="toolbar-node-menu">
            {[
              ["email", "Email", "#363b99"],
              ["social", "Social", "#e92eaa"],
              ["website", "Website", "#00b881"],
              ["advertising", "Advertising", "#ee2d66"],
              ["packaging", "Packaging", "#ff7b2c"],
            ].map(([category, label, color]) => (
              <button
                type="button"
                key={category}
                onClick={() => {
                  onAddNode(category);
                  setAddMenuOpen(false);
                }}
              >
                <span style={{ "--node-color": color }}>+</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={"canvas-topbar-right" + (panelOpen ? " panel-open" : "")}>
        <div className={"canvas-topbar-actions" + (panelOpen ? " panel-open" : "")}>
          <ModelSelector tier={tier} onTier={onTier} />
          <button
            className="toolbar-generate"
            disabled={generating || atGenLimit}
            onClick={onGenerate}
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
        {!panelOpen && (
          <button
            type="button"
            className="toolbar-panel-toggle"
            aria-label="Open brand information panel"
            aria-expanded={false}
            onClick={onTogglePanel}
          >
            <span /><span /><span />
          </button>
        )}
      </div>
    </header>
  );
}
