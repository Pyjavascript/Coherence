const KEY = "bl_client_id";
export const LIMITS = { brands: 2, generations: 40 };

export function getClientId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}