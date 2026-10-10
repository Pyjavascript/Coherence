// Brand images are stored inline on the brand row, so shrink them first:
// a phone photo becomes a few KB instead of several MB.
export const LOGO_MAX_PX = 160;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
}

export async function resizeImageFile(file, max = LOGO_MAX_PX) {
  if (!file?.type?.startsWith("image/")) throw new Error("not-image");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
    const width = Math.max(1, Math.round((img.naturalWidth || max) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || max) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    // WebP keeps transparency and is smallest; browsers without it fall back to PNG.
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Profile photos live in the user's auth metadata, which rides along in every
// session token, so keep them tiny: a centre-cropped square of AVATAR_PX.
export const AVATAR_PX = 128;

export async function resizeAvatarFile(file, size = AVATAR_PX) {
  if (!file?.type?.startsWith("image/")) throw new Error("not-image");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth || size, img.naturalHeight || size);
    const sx = ((img.naturalWidth || size) - side) / 2;
    const sy = ((img.naturalHeight || size) - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
