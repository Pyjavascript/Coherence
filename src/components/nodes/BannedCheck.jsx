import { bannedTerms, findBanned } from "../../lib/banned";

// One line under generated copy that checks it against the brand's "Never use"
// list: which banned words it still uses, or that it's clean. Hidden when the
// brand has no banned words. copy = any item / variant shape.
export default function BannedCheck({ copy, banned, className = "" }) {
  const terms = bannedTerms(banned);
  if (!terms.length || !copy) return null;
  const hits = findBanned(copy, terms);
  const list = terms.join(", ");
  return hits.length ? (
    <p className={`banned-check is-hit ${className}`} role="status" title={`Never use: ${list}`}>
      ⚠ Uses banned {hits.length === 1 ? "word" : "words"}: <b>{hits.join(", ")}</b>
    </p>
  ) : (
    <p className={`banned-check is-clean ${className}`} title={`Never use: ${list}`}>
      ✓ No banned words
    </p>
  );
}
