import { MEDIA_BY_KEY } from "./constants";
import { toDisplay } from "./copyItems";

// Favourite variant first, then the rest in their original order.
const ordered = (node) => {
  const items = node.items.map((item, index) => ({ item, index, fav: index === node.fav }));
  return [...items.filter((x) => x.fav), ...items.filter((x) => !x.fav)];
};

const labelOf = (node) => MEDIA_BY_KEY[node.type]?.label || node.type;

export function gridToText(nodes, brandName) {
  const head = `${brandName || "Untitled brand"} — Coherence copy (${new Date().toLocaleDateString()})`;
  const blocks = nodes.map((node) => {
    const lines = ordered(node).map(({ item, index, fav }) => {
      const d = toDisplay(item);
      const tag = node.items.length > 1 ? `${fav ? "★ " : ""}Variant ${index + 1}: ` : fav ? "★ " : "";
      return [`${tag}${d.headline}`, d.sub ? `  ${d.sub}` : ""].filter(Boolean).join("\n");
    });
    return `== ${labelOf(node)} ==\n${lines.join("\n\n")}`;
  });
  return [head, ...blocks].join("\n\n");
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function gridToCsv(nodes) {
  const rows = [["Medium", "Variant", "Favourite", "Headline", "Supporting line"]];
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
