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

// How a brand logo sits in its round badge (BrandLogo.jsx), read from its
// edge pixels:
//   plate  - a solid background: the badge takes that colour and shows the
//            logo trimmed to its content, so the two read as one shape;
//   cutout - transparent edges: the trimmed logo on a white badge;
//   photo  - busy edges: the image fills the badge.
// `src` is the trimmed image (plate, cutout) and `aspect` its width / height.
const fits = new Map();
const pending = new Map();
const PHOTO = { kind: "photo" };

export const logoFitNow = (src) => fits.get(src) || null;

export function logoFit(src) {
  if (fits.has(src)) return Promise.resolve(fits.get(src));
  if (!pending.has(src)) {
    pending.set(src, loadImage(src)
      .then(readLogoFit, () => PHOTO)
      .catch(() => PHOTO) // a cross-origin image can't be read back
      .then((fit) => {
        fits.set(src, fit);
        pending.delete(src);
        return fit;
      }));
  }
  return pending.get(src);
}

function readLogoFit(img) {
  const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const at = (x, y) => (y * w + x) * 4;

  const edge = [];
  for (let x = 0; x < w; x++) edge.push(at(x, 0), at(x, h - 1));
  for (let y = 1; y < h - 1; y++) edge.push(at(0, y), at(w - 1, y));
  const clear = edge.filter((i) => px[i + 3] < 40);

  let isContent;
  let plate = null;
  if (clear.length > edge.length / 2) {
    isContent = (i) => px[i + 3] >= 40;
  } else {
    const solid = edge.filter((i) => px[i + 3] >= 40);
    const mean = [0, 1, 2].map((c) => solid.reduce((sum, i) => sum + px[i + c], 0) / solid.length);
    const dist = (i) => Math.abs(px[i] - mean[0]) + Math.abs(px[i + 1] - mean[1]) + Math.abs(px[i + 2] - mean[2]);
    if (solid.reduce((sum, i) => sum + dist(i), 0) / solid.length > 30) return PHOTO;
    plate = `rgb(${mean.map(Math.round).join(" ")})`;
    isContent = (i) => px[i + 3] >= 40 && dist(i) > 48;
  }

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isContent(at(x, y))) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { kind: plate ? "plate" : "cutout", plate, src: img.src, aspect: w / h };

  // A little breathing room around the trimmed logo.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  crop.getContext("2d").drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return { kind: plate ? "plate" : "cutout", plate, src: crop.toDataURL("image/png"), aspect: cw / ch };
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
