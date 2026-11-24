// The "Select a layout" tiles (a Quick Grid card's or a Node Studio node's
// settings), shared by the app (the picker, and the card's copy boxes) and
// the generate function (how many pieces of copy to write, and how long each
// is).
//
// Each tile is drawn as its blocks: [x, y, w, h] in a 40 × 30 box, listed in
// reading order (left to right, top to bottom). The first block is always the
// heading; every block after it is a description: "sub", then "sub2" (a node's
// "body", then "body2"). Every description block gets the full description
// word target, so a second description is as long as the first.
//
// `id` is what a card stores and the server receives. The tiles are listed in
// the design's order, and the last, "Bar over a block", is the default: id 0,
// the value every card already had, so existing cards (and clients that send
// no layout, like the Figma plugin) keep it. It is the card as it always was:
// the heading's box hugs its text and the description's fills the rest
// (`natural`), with the original prompt (no layout guide). The other tiles
// draw their boxes in the tile's proportions.
export const COPY_LAYOUTS = [
  {
    id: 4,
    name: "Two rows",
    blocks: [[0, 3, 40, 11], [0, 16, 40, 11]],
    guide: "headline sits in the top box; sub fills the equal-sized box below it",
  },
  {
    id: 1,
    name: "Two over one row",
    blocks: [[0, 3, 19, 11], [21, 3, 19, 11], [0, 16, 40, 11]],
    guide: "headline and sub sit side by side as two small half-width boxes on the top row, so keep the headline to a few punchy words; sub2 fills the full-width box below; sub and sub2 are the same length",
  },
  {
    id: 2,
    name: "Three rows",
    blocks: [[0, 3, 40, 5.5], [0, 10.25, 40, 9.5], [0, 21.5, 40, 5.5]],
    guide: "three stacked full-width rows: headline is a thin top bar (one short line), sub is the middle box, sub2 is the bottom box and closes the piece; sub and sub2 are the same length",
  },
  {
    id: 3,
    name: "One row over two",
    blocks: [[0, 3, 40, 11], [0, 16, 19, 11], [21, 16, 19, 11]],
    guide: "headline fills the full-width top box; sub and sub2 sit side by side as two equal half-width boxes below it, two parallel points of similar length",
  },
  {
    id: 0,
    name: "Bar over a block",
    blocks: [[0, 3, 40, 6], [0, 11, 40, 16]],
    natural: true,
    guide: "",
  },
];

export const DEFAULT_LAYOUT = 0;

// The description fields, in order, for a Quick Grid item and a node variant.
export const GRID_DESC_FIELDS = ["sub", "sub2"];
export const NODE_DESC_FIELDS = ["body", "body2"];

// A layout id as sent by a client: a known tile's, else the default's.
export const layoutId = (value) => {
  const n = Math.round(Number(value));
  return COPY_LAYOUTS.some((l) => l.id === n) ? n : DEFAULT_LAYOUT;
};

export const layoutOf = (value) => COPY_LAYOUTS.find((l) => l.id === layoutId(value));

// How many description boxes a layout has (1 or 2).
export const descCount = (value) => layoutOf(value).blocks.length - 1;

// Each description box's word target: every box gets the full description
// target the user set (a second description is as long as the first).
export function splitWords(total, value) {
  const n = Math.max(1, Math.round(Number(total) || 0));
  return Array.from({ length: descCount(value) }, () => n);
}

// The heading's block is smaller than a full-width row (half width, or a thin
// bar): its default length is cut so it fits (a user-set length is kept).
// Never for the default tile, whose heading box hugs its text.
export function compactHeading(value) {
  const layout = layoutOf(value);
  if (layout.natural) return false;
  const [, , w, h] = layout.blocks[0];
  return w < 40 || h < 8;
}

// The CSS grid that draws a layout's boxes: { columns, rows, areas, natural,
// boxes: [{ area, large }] }. Rows follow the blocks' heights (as fr),
// columns their halves; box i is grid-area `b{i}`. The default tile
// (`natural`) instead sizes the heading's row to its text (up to 45% of the
// card) and gives the description the rest. `large` marks the biggest
// description box (the rounder corner; where the banned-words check and the
// variant tabs go).
export function layoutGrid(value) {
  const { blocks, natural = false } = layoutOf(value);
  const ys = [...new Set(blocks.map(([, y]) => y))].sort((a, b) => a - b);
  const halves = blocks.some(([, , w]) => w < 40);
  const rows = ys.map((y) => blocks.find(([, by]) => by === y)[3]);
  const cells = ys.map(() => (halves ? ["", ""] : [""]));
  blocks.forEach(([x, y, w], i) => {
    const row = ys.indexOf(y);
    const name = `b${i}`;
    if (!halves || w >= 40) cells[row].fill(name);
    else cells[row][x === 0 ? 0 : 1] = name;
  });
  const areas = blocks.slice(1).map(([, , w, h]) => w * h);
  const biggest = Math.max(...areas);
  return {
    natural,
    columns: halves ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
    rows: natural ? "fit-content(45%) minmax(0, 1fr)" : rows.map((h) => `minmax(0, ${h}fr)`).join(" "),
    areas: cells.map((r) => `"${r.join(" ")}"`).join(" "),
    boxes: blocks.map((_, i) => ({ area: `b${i}`, large: i > 0 && areas[i - 1] === biggest })),
  };
}

// The layout's guide for a prompt, in the answer's own field names (a Quick
// Grid item's sub / sub2, or a node's body / body2). "" for the default tile.
export const layoutGuide = (value, fields = GRID_DESC_FIELDS) =>
  layoutOf(value).guide.replace(/\bsub2\b/g, fields[1]).replace(/\bsub\b/g, fields[0]);
