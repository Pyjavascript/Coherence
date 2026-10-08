// Label for the platform's command key, used in tooltips ("Ctrl+S" / "⌘S").
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");

export const MOD = isMac ? "⌘" : "Ctrl+";
export const shortcut = (key) => `${MOD}${key}`;
