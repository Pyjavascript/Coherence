// Placeholder mark for brands without an uploaded logo. The color is picked
// from the brand's id, so it looks random but stays the same across renders.
const MARK_COLORS = ["#2B308B", "#F47B2B", "#00B475"];

export const markColorOf = (brand) => {
  const key = String(brand?.id ?? brand?.name ?? "");
  // FNV-1a plus a murmur finalizer, so ids that differ by one character
  // (brand-1, brand-2, ...) don't land on colors in a predictable order.
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return MARK_COLORS[(hash >>> 0) % MARK_COLORS.length];
};

export default function BrandMark({ brand, className }) {
  const color = markColorOf(brand);
  return (
    <svg className={className} viewBox="0 0 50 50" fill="none" aria-hidden="true">
      <rect width="50" height="50" rx="25" fill="white" />
      <rect x="20.625" y="11.8477" width="8.76833" height="8.76833" fill={color} />
      <rect x="29.3828" y="20.6172" width="8.76833" height="8.76833" fill={color} />
      <rect x="20.625" y="29.3867" width="8.76833" height="8.76833" fill={color} />
      <rect x="11.8516" y="20.6172" width="8.76833" height="8.76833" fill={color} />
    </svg>
  );
}
