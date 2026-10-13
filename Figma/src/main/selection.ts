import { LIMITS, type SelectedText, type SelectionInfo } from "../shared/protocol";

// A layer counts as locked if it, or any layer above it, is locked.
export function isLocked(node: BaseNode): boolean {
  let n: BaseNode | null = node;
  while (n && n.type !== "PAGE" && n.type !== "DOCUMENT") {
    if ("locked" in n && n.locked) return true;
    n = n.parent;
  }
  return false;
}

function describe(node: TextNode, direct: boolean): SelectedText {
  const chars = node.characters;
  return {
    id: node.id,
    name: node.name.slice(0, LIMITS.name),
    characters: chars.slice(0, LIMITS.selectionChars),
    truncated: chars.length > LIMITS.selectionChars,
    direct,
    locked: isLocked(node),
    hasMissingFont: node.hasMissingFont,
  };
}

// Text layers in the current selection: selected text layers first-hand, plus
// visible text inside selected frames / groups, capped at LIMITS.selectionTexts.
export function readSelection(): SelectionInfo {
  const selection = figma.currentPage.selection;
  const texts: SelectedText[] = [];
  let moreTexts = false;

  const add = (node: TextNode, direct: boolean) => {
    if (texts.length >= LIMITS.selectionTexts) {
      moreTexts = true;
      return;
    }
    texts.push(describe(node, direct));
  };

  for (const node of selection) {
    if (moreTexts) break;
    if (node.type === "TEXT") add(node, true);
    else if ("findAllWithCriteria" in node) {
      for (const t of node.findAllWithCriteria({ types: ["TEXT"] })) {
        if (!t.visible) continue;
        add(t, false);
        if (moreTexts) break;
      }
    }
  }

  // Replacing is offered only for exactly one selected, editable text layer
  // whose full text the UI has seen.
  const only = selection.length === 1 && selection[0].type === "TEXT" ? texts[0] : null;
  const replaceTargetId = only && !only.locked && !only.hasMissingFont && !only.truncated ? only.id : null;

  return { total: selection.length, texts, moreTexts, replaceTargetId };
}
