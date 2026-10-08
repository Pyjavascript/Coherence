// Brand images are stored inline on the brand row, so shrink them first:
// a phone photo becomes a few KB instead of several MB.
export const LOGO_MAX_PX = 160;

export async function resizeImageFile(file, max = LOGO_MAX_PX) {
  if (!file?.type?.startsWith("image/")) throw new Error("not-image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
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
