import { INDUSTRY_LAYERS, MEDIA_BY_KEY, STYLE_PACKS } from "./constants";
import { toDisplay } from "./copyItems";

// The brand panel's settings as [label, value] rows, labelled as the panel
// labels them. Empty text fields are left out. ctx = { brand, notes, stylePack }.
export function brandSettings({ brand, notes = [], stylePack }) {
  const rows = [
    ["Brand Name", brand.name],
    ["Core Belief", brand.belief],
    ["Brand message", brand.message],
    ["Industry Category", INDUSTRY_LAYERS[brand.industry]?.label || brand.industry],
    ["Funnel Stage", brand.stage],
    ["Language", brand.mode],
    ["Audience Posture", brand.audience],
    ["Customer Pain Points", brand.pain],
    ["Desired Emotions", brand.emo],
    ["Formality", brand.formality],
    ["Objection to pre-empt", brand.objection],
    ["CTA intensity", brand.cta],
    ["Avoid words", brand.banned],
    ["Location", brand.location],
    ["Output Language", brand.language || "English"],
    ["Style Pack", STYLE_PACKS[stylePack]?.label || stylePack],
    ...notes.map((n) => [`Research note (${n.type})`, n.text]),
  ];
  return rows
    .map(([label, value]) => [label, String(value ?? "").trim()])
    .filter(([, value]) => value);
}

// Favourite variant first, then the rest in their original order.
const ordered = (node) => {
  const items = node.items.map((item, index) => ({ item, index, fav: index === node.fav }));
  return [...items.filter((x) => x.fav), ...items.filter((x) => !x.fav)];
};

// The card's own title, else its medium's name.
const labelOf = (node) => node.label?.trim() || MEDIA_BY_KEY[node.type]?.label || node.type;

export function gridToText(nodes, ctx) {
  const head = `${ctx.brand.name || "Untitled brand"} — Coherence copy (${new Date().toLocaleDateString()})`;
  const settings = `== Brand settings ==\n${brandSettings(ctx).map(([label, value]) => `${label}: ${value}`).join("\n")}`;
  const blocks = nodes.map((node) => {
    const lines = ordered(node).map(({ item, index, fav }) => {
      const d = toDisplay(item);
      const tag = node.items.length > 1 ? `${fav ? "★ " : ""}Variant ${index + 1}: ` : fav ? "★ " : "";
      return [`${tag}${d.headline}`, d.sub ? `  ${d.sub}` : ""].filter(Boolean).join("\n");
    });
    return `== ${labelOf(node)} ==\n${lines.join("\n\n")}`;
  });
  return [head, settings, ...blocks].join("\n\n");
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// The brand settings first (two columns), a blank row, then the copy table.
export function gridToCsv(nodes, ctx) {
  const rows = [
    ["Brand setting", "Value"],
    ...brandSettings(ctx),
    [],
    ["Medium", "Variant", "Favourite", "Headline", "Supporting line"],
  ];
  nodes.forEach((node) => {
    ordered(node).forEach(({ item, index, fav }) => {
      const d = toDisplay(item);
      rows.push([labelOf(node), index + 1, fav ? "yes" : "", d.headline, d.sub]);
    });
  });
  // BOM so Excel opens UTF-8 (em dashes, curly quotes) correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSlug = (name) =>
  (String(name || "coherence").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "coherence") + "-copy";
