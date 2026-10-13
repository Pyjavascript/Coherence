// The only code that changes the user's document. Both actions run only from
// an explicit button press in the UI, and each ends with figma.commitUndo() so
// a single Ctrl/Cmd+Z reverts exactly that action.
import type { TextBlock } from "../shared/protocol";
import { PluginFail } from "./errors";
import { isLocked } from "./selection";

const REGULAR: FontName = { family: "Inter", style: "Regular" };
const BOLD: FontName = { family: "Inter", style: "Bold" };
const WIDTH = 360;
const GAP = 48;
const STYLE: Record<TextBlock["role"], { font: FontName; size: number }> = {
  headline: { font: BOLD, size: 24 },
  body: { font: REGULAR, size: 14 },
};

function makeText(block: TextBlock): TextNode {
  const t = figma.createText();
  const style = STYLE[block.role];
  t.fontName = style.font;
  t.fontSize = style.size;
  t.characters = block.text;
  t.name = block.role === "headline" ? "Headline" : "Body";
  return t;
}

// Beside the current selection if there is one, otherwise in the middle of the viewport.
function place(node: SceneNode) {
  const boxes = figma.currentPage.selection
    .map((n) => n.absoluteBoundingBox)
    .filter((b): b is Rect => Boolean(b));
  if (boxes.length) {
    node.x = Math.max(...boxes.map((b) => b.x + b.width)) + GAP;
    node.y = Math.min(...boxes.map((b) => b.y));
  } else {
    const c = figma.viewport.center;
    node.x = Math.round(c.x - node.width / 2);
    node.y = Math.round(c.y - node.height / 2);
  }
}

// Creates new layers; never touches existing ones.
export async function insertText(name: string, blocks: TextBlock[]): Promise<{ nodeId: string }> {
  try {
    await Promise.all([figma.loadFontAsync(REGULAR), figma.loadFontAsync(BOLD)]);
  } catch {
    throw new PluginFail("missing_font", "Couldn't load the Inter font needed for new text.");
  }

  let node: SceneNode;
  try {
    if (blocks.length === 1) {
      const t = makeText(blocks[0]);
      t.name = name || t.name;
      t.resize(WIDTH, t.height);
      t.textAutoResize = "HEIGHT";
      node = t;
    } else {
      const frame = figma.createFrame();
      frame.name = name || "Brand Language OS copy";
      frame.layoutMode = "VERTICAL";
      frame.primaryAxisSizingMode = "AUTO";
      frame.counterAxisSizingMode = "FIXED";
      frame.itemSpacing = 12;
      frame.fills = [];
      frame.clipsContent = false;
      frame.resize(WIDTH, 100);
      for (const block of blocks) {
        const t = makeText(block);
        frame.appendChild(t);
        t.layoutAlign = "STRETCH";
        t.textAutoResize = "HEIGHT";
      }
      node = frame;
    }
    place(node);
    figma.currentPage.appendChild(node);
  } catch {
    throw new PluginFail("write_failed", "Couldn't add the text to the canvas.");
  }

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.commitUndo();
  return { nodeId: node.id };
}

// Replaces the characters of one text layer the user explicitly chose. Refuses
// if the layer is gone, locked, uses a missing font, or its text changed since
// the UI last showed it (`expected`).
export async function replaceText(nodeId: string, expected: string, text: string): Promise<{ nodeId: string }> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.removed) throw new PluginFail("not_found", "That layer no longer exists. Select it again.");
  if (node.type !== "TEXT") throw new PluginFail("not_text", "Only text layers can be replaced.");
  if (isLocked(node)) throw new PluginFail("locked", "That layer is locked. Unlock it to replace its text.");
  if (node.characters !== expected) {
    throw new PluginFail("text_changed", "The layer's text changed since you selected it. Check it and try again.");
  }
  if (node.hasMissingFont) {
    throw new PluginFail("missing_font", "This layer uses a font that isn't installed. Install it or change the font first.");
  }

  try {
    const fonts =
      node.characters.length > 0
        ? node.getRangeAllFontNames(0, node.characters.length)
        : node.fontName === figma.mixed
          ? []
          : [node.fontName];
    await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
  } catch {
    throw new PluginFail("missing_font", "Couldn't load this layer's fonts.");
  }

  try {
    node.characters = text;
  } catch {
    throw new PluginFail("write_failed", "Figma didn't allow this layer to be edited.");
  }
  figma.commitUndo();
  return { nodeId: node.id };
}
