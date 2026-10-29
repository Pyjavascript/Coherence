// One-line examples for a card's "Job requirement" and "Specific requirements"
// fields, picked to suit its medium. Keys are the Quick Grid media and the Node
// Studio categories (lib/constants MEDIA / NODE_CATS).
const FIELD_PLACEHOLDERS = {
  email: { job: "e.g. Win back customers who stopped buying", req: "e.g. Short subject, one clear link" },
  social: { job: "e.g. Tease the new flavour before launch", req: "e.g. Casual tone, end with a question" },
  website: { job: "e.g. Show why we're worth the price", req: "e.g. Plain words, no jargon" },
  packaging: { job: "e.g. Stand out on a busy shelf", req: "e.g. Under 6 words, say it's vegan" },
  advertising: { job: "e.g. Get people to try a free sample", req: "e.g. Lead with the offer, one CTA" },
  marketing: { job: "e.g. Launch the autumn collection", req: "e.g. One punchy line, no hashtags" },
};

const FALLBACK = { job: "e.g. Win back customers who stopped buying", req: "e.g. Short lines, mention free delivery" };

export const fieldPlaceholders = (medium) => FIELD_PLACEHOLDERS[medium] || FALLBACK;
