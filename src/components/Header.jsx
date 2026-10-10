import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MODEL_OPTIONS } from "../lib/constants";
import { shortcut } from "../lib/shortcuts";
import { ChatGpt } from "../assets/globalAssets";

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
                <span className="model-selector-option-icon" aria-hidden="true">{index === 0 ? <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.7373 3.53671C7.25628 2.49411 8.74372 2.49412 9.2627 3.53672L10.448 5.91787C10.5847 6.19263 10.8074 6.41527 11.0821 6.55204L13.4633 7.7373C14.5059 8.25628 14.5059 9.74372 13.4633 10.2627L11.0821 11.448C10.8074 11.5847 10.5847 11.8074 10.448 12.0821L9.2627 14.4633C8.74372 15.5059 7.25628 15.5059 6.7373 14.4633L5.55204 12.0821C5.41527 11.8074 5.19263 11.5847 4.91787 11.448L2.53671 10.2627C1.49411 9.74372 1.49412 8.25628 2.53672 7.7373L4.91787 6.55204C5.19263 6.41527 5.41527 6.19263 5.55204 5.91787L6.7373 3.53671Z" fill="#0A144B" />
                  <path d="M13.5264 0.951296C13.721 0.560319 14.2788 0.560319 14.4734 0.951296L14.9178 1.8442C14.9691 1.94724 15.0526 2.03073 15.1556 2.08202L16.0485 2.5265C16.4395 2.72112 16.4395 3.27888 16.0485 3.4735L15.1556 3.91798C15.0526 3.96927 14.9691 4.05276 14.9178 4.1558L14.4734 5.0487C14.2788 5.43968 13.721 5.43968 13.5264 5.0487L13.0819 4.1558C13.0306 4.05276 12.9472 3.96927 12.8441 3.91798L11.9512 3.4735C11.5602 3.27888 11.5602 2.72112 11.9512 2.5265L12.8441 2.08202C12.9472 2.03073 13.0306 1.94724 13.0819 1.8442L13.5264 0.951296Z" fill="#0A144B" />
                </svg>
                  : index === 1 ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.9159 1.905C14.8526 1.78272 14.7568 1.68024 14.639 1.6088C14.5213 1.53736 14.3862 1.49972 14.2484 1.5H7.49844C7.20594 1.5 6.93594 1.6725 6.81594 1.9425L3.06594 10.1925C2.96094 10.425 2.98344 10.695 3.11844 10.9125C3.25344 11.13 3.49344 11.2575 3.74844 11.2575H7.49844V15.7575C7.49844 15.9564 7.57746 16.1472 7.71811 16.2878C7.85876 16.4285 8.04953 16.5075 8.24844 16.5075C8.48094 16.5075 8.71344 16.395 8.85594 16.2L14.8559 7.95C14.9367 7.8381 14.9851 7.70607 14.9957 7.56844C15.0063 7.43082 14.9787 7.29295 14.9159 7.17C14.8543 7.04577 14.7591 6.94128 14.6411 6.86837C14.5232 6.79547 14.3871 6.75706 14.2484 6.7575H11.9534L14.8559 2.6925C14.9367 2.5806 14.9851 2.44857 14.9957 2.31094C15.0063 2.17332 14.9787 2.03545 14.9159 1.9125V1.905Z" fill="#0A144B" />
                  </svg>
                    : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.9834 0.782808C5.50237 -0.259791 6.98982 -0.25979 7.50879 0.782809L8.69406 3.16397C8.83082 3.43872 9.05347 3.66137 9.32822 3.79813L11.7094 4.9834C12.752 5.50237 12.752 6.98982 11.7094 7.50879L9.32822 8.69406C9.05347 8.83082 8.83082 9.05347 8.69406 9.32822L7.50879 11.7094C6.98982 12.752 5.50237 12.752 4.9834 11.7094L3.79813 9.32822C3.66137 9.05347 3.43872 8.83082 3.16397 8.69406L0.782808 7.50879C-0.259791 6.98982 -0.25979 5.50237 0.782809 4.9834L3.16397 3.79813C3.43872 3.66137 3.66137 3.43872 3.79813 3.16396L4.9834 0.782808Z" fill="#0A144B" />
                    </svg>
                }</span>
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
    <path d="M5 8H27" />
    <path d="M5 16H23" />
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
            <MenuIcon />
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
        {/* The panel toggle sits in a navy notch carved out of the workspace corner. */}
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
