import { supabase } from "../lib/supabase";
import { usesPluginKey } from "./ai";
import { DEFAULT_LAYOUT, layoutId } from "../lib/layouts";

// The user's preferred "Select a layout" tile, one per medium: the tile they
// picked last on a card of that medium. Picking one on a Social card changes
// Social cards only (Quick Grid and Node Studio share it); the other media
// keep theirs. It's saved with the user (public.user_settings.copy_layouts,
// migration 20261124120000_user_settings_layout_per_medium.sql) so every
// brand, and every reload, starts its cards in it. A copy in localStorage
// paints the first grid in it before the row has loaded (and keeps a guest's
// picks for the session's device).

const LOCAL_KEY = "blos.copyLayouts";

// Quick Grid's Social card is "marketing"; Node Studio's is "social". Both
// are stored as "social" so the two views share one pick.
const MEDIUM_ALIAS = { marketing: "social" };
export const layoutMedium = (type) => MEDIUM_ALIAS[type] || type || "";

// Only known tile ids, keyed by medium; anything else is dropped.
const clean = (raw) => {
  const out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.entries(raw).forEach(([medium, id]) => {
      const key = layoutMedium(medium);
      if (key) out[key] = layoutId(id);
    });
  }
  return out;
};

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw == null ? {} : clean(JSON.parse(raw));
  } catch {
    return {};
  }
};
const writeLocal = (map) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(map)); } catch { /* not remembered */ }
};

// The old single, account-wide pick: forgotten, so it can't leak onto every card.
try { localStorage.removeItem("blos.copyLayout"); } catch { /* nothing to clear */ }

let current = readLocal();
let userId = null;

// The layout a new card of this medium (a grid card's type or a node's
// category) starts in.
export const preferredLayout = (type) => current[layoutMedium(type)] ?? DEFAULT_LAYOUT;

// Signing out goes back to the defaults, so the next account on this device
// doesn't inherit them.
export function resetPreferences() {
  userId = null;
  current = {};
  writeLocal(current);
}

// The signed-in user's saved layouts: loads their row and makes them the
// preferences. No row yet keeps the current ones.
export async function loadPreferences(id) {
  userId = id;
  if (!supabase || usesPluginKey()) return current;
  const { data, error } = await supabase
    .from("user_settings")
    .select("copy_layouts")
    .eq("user_id", id)
    .maybeSingle();
  // A missing table/column (migration not run yet) or a network error keeps
  // the local preferences; picks still work for the session.
  if (error) {
    console.warn("Couldn't load layout preferences:", error.message);
    return current;
  }
  if (data && userId === id) {
    current = clean(data.copy_layouts);
    writeLocal(current);
  }
  return current;
}

// A layout was picked on a card of this medium: it becomes that medium's
// preference (the other media keep theirs), saved locally at once and to the
// user's row in the background.
export function rememberLayout(type, value) {
  const medium = layoutMedium(type);
  if (!medium) return;
  current = { ...current, [medium]: layoutId(value) };
  writeLocal(current);
  if (!userId || !supabase || usesPluginKey()) return;
  supabase
    .from("user_settings")
    .upsert({ user_id: userId, copy_layouts: current, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .then(({ error }) => {
      if (error) console.warn("Couldn't save layout preference:", error.message);
    });
}
