import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MODEL_OPTIONS } from "../lib/constants";
import { shortcut } from "../lib/shortcuts";
import { ChatGpt } from "../assets/globalAssets";
import { ModelIcon } from "./ModelIcons";

const ExportIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 5v15M10 14l6 6 6-6M6 22v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
  </svg>
);

// Copy or download everything on the Quick Grid.
function ExportMenu({ disabled, onExport }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (kind) => () => { setOpen(false); onExport(kind); };

  return (
    <div className="toolbar-export" ref={rootRef}>
      <button
        type="button"
        className={"toolbar-icon-btn" + (open ? " is-active" : "")}
        aria-label="Export copy"
        title={disabled ? "Generate copy first to export it" : "Export all copy"}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <ExportIcon />
      </button>
      {open && (
        <div className="toolbar-export-menu" role="menu" aria-label="Export">
          <button type="button" role="menuitem" onClick={run("copy")}>Copy all</button>
          <button type="button" role="menuitem" onClick={run("txt")}>Download .txt</button>
          <button type="button" role="menuitem" onClick={run("csv")}>Download .csv</button>
        </div>
      )}
    </div>
  );
}

// Narrowest the model menu gets (it switches to compact rows below 260px, see
// index.css). Narrower than this, as on phones, it keeps its own width instead.
const MODEL_MENU_MIN_WIDTH = 200;

function ModelSelector({ tier, onTier }) {
  const [open, setOpen] = useState(false);
  // offset / width in px keep the menu inside the workspace; null = CSS defaults.
  const [placement, setPlacement] = useState({ offset: null, width: null, up: false });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();
  const selectedIndex = Math.max(0, MODEL_OPTIONS.findIndex((model) => model.value === tier));
  const selected = MODEL_OPTIONS[selectedIndex];

  useLayoutEffect(() => {
    // Reset on close so the next open measures the menu at its natural size.
    if (!open) {
      setPlacement({ offset: null, width: null, up: false });
      return;
    }
    if (!rootRef.current || !menuRef.current) return;
    const triggerRect = rootRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const surfaceRect = rootRef.current.closest(".workspace")?.getBoundingClientRect();
    // Horizontal room: the workspace (or the viewport), less an 8px margin each side.
    const minX = Math.max(8, (surfaceRect?.left ?? 0) + 8);
    const maxX = Math.min(window.innerWidth - 8, (surfaceRect?.right ?? window.innerWidth) - 8);
    // Span from the model button's left edge to the Generate button's right edge.
    // On small toolbars that span is too narrow for the rows, so keep the menu's
    // own width and line its right edge up with Generate's instead.
    const generateRight = rootRef.current.parentElement?.querySelector(".toolbar-generate")?.getBoundingClientRect().right;
    const spanWidth = generateRight ? generateRight - triggerRect.left : 0;
    const spans = spanWidth >= MODEL_MENU_MIN_WIDTH;
    const wanted = spans ? spanWidth : menuRect.width;
    // Place it, slide left until it fits, and shrink if even that isn't enough.
    const width = Math.min(wanted, maxX - minX);
    const preferredLeft = spans || !generateRight ? triggerRect.left : generateRight - width;
    const left = Math.max(minX, Math.min(preferredLeft, maxX - width));
    setPlacement({
      offset: Math.round(left - triggerRect.left),
      width: width !== menuRect.width ? Math.round(width) : null,
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
          className={"model-selector-menu" + (placement.up ? " is-up" : "")}
          style={{
            left: placement.offset ?? undefined,
            width: placement.width ?? undefined,
          }}
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
                <span className="model-selector-option-icon" aria-hidden="true"><ModelIcon tier={model.value} /></span>
                <span className="model-selector-option-text">
                  <span className="model-selector-option-name">{model.label}</span>
                  <span className="model-selector-option-description">{model.description}</span>
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

// Same panel glyph as the desktop sidebar's collapse / expand toggle (BrandSidebar).
const SidebarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M9 4v16" />
  </svg>
);

const PanelIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8.5H26" />
    <path d="M6 16H26" />
    <path d="M6 23.5H26" />
  </svg>
);

// Workspace toolbar: Add Node (options depend on the active view), model
// selector, Generate, and the panel / navigation toggles.
export default function Header({
  tier,
  onTier,
  onGenerate,
  generating,
  generatingDetail,
  atGenLimit,
  showExport,
  exportDisabled,
  onExport,
  addOptions,
  addDisabledTitle,
  onAddNode,
  hideAdd = false,
  showNavToggle,
  navOpen,
  onToggleNav,
  panelOpen,
  hidePanelToggle,
  onTogglePanel,
  onAtLimit,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);
  const canAdd = addOptions.length > 0;

  // Close the menu if the options run out or the button collapses away.
  useEffect(() => {
    if (!canAdd || hideAdd) setAddMenuOpen(false);
  }, [canAdd, hideAdd]);

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
            <SidebarIcon />
          </button>
        )}
        {/* Stays mounted when hidden so it can shrink away / grow back smoothly. */}
        <button
          type="button"
          className={"toolbar-add-node" + (hideAdd ? " is-hidden" : "")}
          inert={hideAdd ? "" : undefined}
          aria-hidden={hideAdd || undefined}
          aria-haspopup="menu"
          aria-expanded={addMenuOpen}
          aria-label="Add node"
          disabled={!canAdd}
          title={canAdd ? undefined : addDisabledTitle}
          onClick={() => setAddMenuOpen((open) => !open)}
        >
          <span className="toolbar-add-label"><span className="tb-label-full">Add Node</span><span className="tb-label-short">Add</span></span>
          <span className="toolbar-add-spark" aria-hidden="true">
            <i>+</i><i>+</i><i>+</i><i>+</i>
          </span>
        </button>
        {addMenuOpen && canAdd && !hideAdd && (
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
        {showExport && <ExportMenu disabled={exportDisabled} onExport={onExport} />}
        <ModelSelector tier={tier} onTier={onTier} />
        <button
          type="button"
          className={"toolbar-generate" + (generating ? " is-busy" : "") + (atGenLimit ? " is-limited" : "")}
          disabled={generating}
          aria-busy={generating}
          aria-disabled={atGenLimit || undefined}
          title={atGenLimit ? "Daily generation limit reached" : `Generate (${shortcut("Enter")})`}
          onClick={() => (atGenLimit ? onAtLimit?.() : onGenerate())}
        >
          {generating && <span className="toolbar-spinner" aria-hidden="true" />}
          <span className="tb-label-full">{generating ? "Generating" : "Generate"}</span>
          <span className="tb-label-short">{generating ? "…" : "Generate"}</span>
          {generating && generatingDetail && <span className="toolbar-gen-detail">{generatingDetail}</span>}
        </button>
        {/* The panel toggle: a navy rounded box at the end of the toolbar. */}
        <div className={"toolbar-panel-notch" + (hidePanelToggle ? " is-hidden" : "")}>
          <button
            type="button"
            className={"toolbar-icon-btn toolbar-panel-btn" + (panelOpen ? " is-active" : "")}
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

      </div>
    </header>
  );
}
