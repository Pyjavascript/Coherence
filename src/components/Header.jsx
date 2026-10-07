import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MODEL_OPTIONS } from "../lib/constants";
import { ChatGpt } from "../assets/globalAssets";

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
    const surfaceRect = rootRef.current.closest(".workspace")?.getBoundingClientRect();
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
        <span className="model-selector-logo" aria-hidden="true"><img src={ChatGpt} alt="ChatGPT" /></span>
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

const MenuIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 8h22M5 16h22M5 24h22" />
  </svg>
);

const PanelIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 16H21" />
    <path d="M5 8H27" />
    <path d="M5 24H17" />
  </svg>
);

// Workspace toolbar: Add Node (options depend on the active view), model
// selector, Generate, and the panel / navigation toggles.
export default function Header({
  tier,
  onTier,
  onGenerate,
  generating,
  atGenLimit,
  addOptions,
  addDisabledTitle,
  onAddNode,
  showNavToggle,
  navOpen,
  onToggleNav,
  panelOpen,
  hidePanelToggle,
  onTogglePanel,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);
  const canAdd = addOptions.length > 0;

  // Close the menu if the options run out (e.g. the grid just became full).
  useEffect(() => {
    if (!canAdd) setAddMenuOpen(false);
  }, [canAdd]);

  useEffect(() => {
    if (!addMenuOpen) return undefined;
    const onDown = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setAddMenuOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setAddMenuOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [addMenuOpen]);

  return (
    <header className="ws-topbar">
      <div className="ws-topbar-start" ref={addMenuRef}>
        {showNavToggle && (
          <button
            type="button"
            className="toolbar-icon-btn"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navOpen}
            onClick={onToggleNav}
          >
            <MenuIcon />
          </button>
        )}
        <button
          type="button"
          className="toolbar-add-node"
          aria-haspopup="menu"
          aria-expanded={addMenuOpen}
          aria-label="Add node"
          disabled={!canAdd}
          title={canAdd ? undefined : addDisabledTitle}
          onClick={() => setAddMenuOpen((open) => !open)}
        >
          <span className="toolbar-add-label">Add Node</span>
          <span className="toolbar-add-spark" aria-hidden="true">
            <i>+</i><i>+</i><i>+</i><i>+</i>
          </span>
        </button>
        {addMenuOpen && canAdd && (
          <div className="toolbar-node-menu" role="menu" aria-label="Add a node">
            {addOptions.map((option) => (
              <button
                type="button"
                role="menuitem"
                key={option.type}
                onClick={() => {
                  onAddNode(option.type);
                  setAddMenuOpen(false);
                }}
              >
                <span style={{ "--node-color": option.color }} aria-hidden="true">+</span>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ws-topbar-end">
        <ModelSelector tier={tier} onTier={onTier} />
        <button
          type="button"
          className={"toolbar-generate" + (generating ? " is-busy" : "")}
          disabled={generating || atGenLimit}
          aria-busy={generating}
          title={atGenLimit ? "Daily generation limit reached" : undefined}
          onClick={onGenerate}
        >
          {generating && <span className="toolbar-spinner" aria-hidden="true" />}
          <span>{generating ? "Generating" : "Generate"}</span>
        </button>
        <button
          type="button"
          className={"toolbar-icon-btn toolbar-panel-btn" + (panelOpen ? " is-active" : "") + (hidePanelToggle ? " is-hidden" : "")}
          tabIndex={hidePanelToggle ? -1 : undefined}
          aria-hidden={hidePanelToggle || undefined}
          aria-label={panelOpen ? "Close brand panel" : "Open brand panel"}
          aria-expanded={panelOpen}
          aria-controls="brand-panel"
          onClick={onTogglePanel}
        >
          <PanelIcon />
        </button>

      </div>
    </header>
  );
}
