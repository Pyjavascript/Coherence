// figma.clientStorage is local to this machine and this plugin id; it is kept
// "for stability, not security", so it holds only the plugin's own Supabase
// session and UI preferences. Keys are allow-listed in shared/protocol.ts.

export async function getItem(key: string): Promise<{ value: string | null }> {
  const value = await figma.clientStorage.getAsync(key);
  return { value: typeof value === "string" ? value : null };
}

export async function setItem(key: string, value: string): Promise<null> {
  await figma.clientStorage.setAsync(key, value);
  return null;
}

export async function removeItem(key: string): Promise<null> {
  await figma.clientStorage.deleteAsync(key);
  return null;
}
