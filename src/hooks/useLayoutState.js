import { useCallback, useEffect, useReducer } from "react";
import { useBreakpoint } from "./useBreakpoint";

// Single source of truth for the shell: which panels are open and which view
// is active. On laptops and tablets the brand panel floats inline
// (`rightOpen`, persisted) and the rail stays collapsed: it never opens. Phones
// use drawers for both (`drawer`, never persisted). Only one is open at a
// time: opening one collapses the other.
const KEY = "coherence.ui.v1";
const VIEWS = ["quick", "nodes"];
const DEFAULTS = { leftOpen: false, rightOpen: false, view: "quick", drawer: null };

// The app always opens on Quick Grid; only the panels' open state is restored.
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      ...DEFAULTS,
      // The rail no longer opens inline (leftOpen below); an old saved
      // "open" is dropped.
      leftOpen: false,
      rightOpen: Boolean(raw.rightOpen),
    };
  } catch {
    return DEFAULTS;
  }
}

const sideKey = (side) => (side === "left" ? "leftOpen" : "rightOpen");
const otherKey = (side) => sideKey(side === "left" ? "right" : "left");

// Inline panels: opening one closes the other (an open drawer too);
// closing leaves the other alone.
function setInline(state, side, open) {
  if (state[sideKey(side)] === open && (!open || (!state[otherKey(side)] && !state.drawer))) return state;
  return open
    ? { ...state, [sideKey(side)]: true, [otherKey(side)]: false, drawer: null }
    : { ...state, [sideKey(side)]: false };
}

function reducer(state, action) {
  const { type, side, inline } = action;
  switch (type) {
    case "set": {
      if (inline) return setInline(state, side, action.open);
      const drawer = action.open ? side : state.drawer === side ? null : state.drawer;
      if (drawer === state.drawer) return state;
      // A drawer opening closes the inline brand panel (tablets).
      return { ...state, drawer, ...(drawer ? { [otherKey(drawer)]: false } : null) };
    }
    case "toggle": {
      if (inline) return setInline(state, side, !state[sideKey(side)]);
      const drawer = state.drawer === side ? null : side;
      return { ...state, drawer, ...(drawer ? { [otherKey(drawer)]: false } : null) };
    }
    case "closeDrawer":
      return state.drawer ? { ...state, drawer: null } : state;
    case "view":
      return VIEWS.includes(action.view) && action.view !== state.view ? { ...state, view: action.view } : state;
    default:
      return state;
  }
}

export function useLayoutState() {
  const bp = useBreakpoint();
  const inline = bp === "desktop";
  // The brand panel sits inline everywhere but phones.
  const rightInline = bp !== "mobile";
  const inlineFor = useCallback((side) => (side === "right" ? rightInline : inline), [inline, rightInline]);
  const [state, dispatch] = useReducer(reducer, undefined, load);

  // Drawers never survive a breakpoint change.
  useEffect(() => { dispatch({ type: "closeDrawer" }); }, [bp]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ leftOpen: state.leftOpen, rightOpen: state.rightOpen, view: state.view }));
    } catch {
      /* storage unavailable — UI still works, just not remembered */
    }
  }, [state.leftOpen, state.rightOpen, state.view]);

  // The left rail only opens as the phone drawer (see leftOpen below).
  const canOpen = useCallback((side) => side === "right" || bp === "mobile", [bp]);
  const toggle = useCallback((side) => {
    if (canOpen(side)) dispatch({ type: "toggle", side, inline: inlineFor(side) });
  }, [inlineFor, canOpen]);
  const open = useCallback((side) => {
    if (canOpen(side)) dispatch({ type: "set", side, open: true, inline: inlineFor(side) });
  }, [inlineFor, canOpen]);
  const close = useCallback((side) => dispatch({ type: "set", side, open: false, inline: inlineFor(side) }), [inlineFor]);
  const closeDrawer = useCallback(() => dispatch({ type: "closeDrawer" }), []);
  const setView = useCallback((view) => dispatch({ type: "view", view }), []);

  // Escape dismisses the active drawer (but not while a dropdown inside it is open).
  useEffect(() => {
    if (!state.drawer) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.target?.closest?.('[role="listbox"], [aria-expanded="true"], [role="dialog"]')) return;
      closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.drawer, closeDrawer]);

  return {
    bp,
    inline,
    rightInline,
    // Phones have Quick Grid only (no Grid | Node switch); the chosen view
    // comes back on a wider screen.
    view: bp === "mobile" ? "quick" : state.view,
    drawer: inline ? null : rightInline && state.drawer === "right" ? null : state.drawer,
    // The rail never opens on laptops or tablets (it works collapsed); only
    // the phone drawer opens it.
    leftOpen: bp === "mobile" && state.drawer === "left",
    rightOpen: rightInline ? state.rightOpen : state.drawer === "right",
    toggle,
    open,
    close,
    closeDrawer,
    setView,
  };
}
