// One-line examples for a card's "Job requirement" field, picked to suit its
// medium. Keys are the Quick Grid media and the Node
// Studio categories (lib/constants MEDIA / NODE_CATS).
const FIELD_PLACEHOLDERS = {
  email: { job: "e.g. Win back customers who left" },
  social: { job: "e.g. Tease the new flavour before launch" },
  website: { job: "e.g. Show why we're worth the price" },
  packaging: { job: "e.g. Stand out on a busy shelf" },
  advertising: { job: "e.g. Get people to try a free sample" },
  marketing: { job: "e.g. Launch the autumn collection" },
};

const FALLBACK = { job: "e.g. Win back customers who left" };

export const fieldPlaceholders = (medium) => FIELD_PLACEHOLDERS[medium] || FALLBACK;
