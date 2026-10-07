import { useCallback, useEffect, useReducer } from "react";
import { useBreakpoint } from "./useBreakpoint";

// Single source of truth for the shell: which panels are open and which view
// is active. On desktop both side panels sit inline and are independent
// (`leftOpen` / `rightOpen`, persisted). Below desktop they become drawers and
// only one may be open at a time (`drawer`, never persisted).
const KEY = "coherence.ui.v1";
const VIEWS = ["quick", "nodes"];
const DEFAULTS = { leftOpen: false, rightOpen: false, view: "quick", drawer: null };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      ...DEFAULTS,
      leftOpen: Boolean(raw.leftOpen),
      rightOpen: Boolean(raw.rightOpen),
      view: VIEWS.includes(raw.view) ? raw.view : DEFAULTS.view,
    };
  } catch {
    return DEFAULTS;
  }
}

const sideKey = (side) => (side === "left" ? "leftOpen" : "rightOpen");

function reducer(state, action) {
  const { type, side, inline } = action;
  switch (type) {
    case "set": {
      if (inline) return state[sideKey(side)] === action.open ? state : { ...state, [sideKey(side)]: action.open };
      const drawer = action.open ? side : state.drawer === side ? null : state.drawer;
      return drawer === state.drawer ? state : { ...state, drawer };
    }
    case "toggle": {
      if (inline) return { ...state, [sideKey(side)]: !state[sideKey(side)] };
      return { ...state, drawer: state.drawer === side ? null : side };
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

  const toggle = useCallback((side) => dispatch({ type: "toggle", side, inline }), [inline]);
  const open = useCallback((side) => dispatch({ type: "set", side, open: true, inline }), [inline]);
  const close = useCallback((side) => dispatch({ type: "set", side, open: false, inline }), [inline]);
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
    view: state.view,
    drawer: inline ? null : state.drawer,
    leftOpen: inline ? state.leftOpen : state.drawer === "left",
    rightOpen: inline ? state.rightOpen : state.drawer === "right",
    toggle,
    open,
    close,
    closeDrawer,
    setView,
  };
}
