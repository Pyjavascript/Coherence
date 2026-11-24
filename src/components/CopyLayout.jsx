import { layoutGrid, layoutId } from "../lib/layouts";

// A card's copy boxes laid out as its "Select a layout" tile (lib/layouts.js),
// in the tile's proportions: a CSS grid whose rows follow the blocks' heights
// and whose columns their halves. Box 0 is the heading; boxes 1 and 2 the
// descriptions. Used by a Quick Grid card (NodeContent.jsx) and a Node Studio
// node (NodeStudio.jsx).
// renderBox(index, { area, large }, style) returns box `index`, with `style`
// (its grid-area) and a key.
export default function CopyLayout({ layout, className = "", renderBox, ...rest }) {
  const grid = layoutGrid(layout);
  return (
    <div
      {...rest}
      className={(className ? className + " " : "") + "copy-layout"}
      data-layout={layoutId(layout)}
      data-natural={grid.natural || undefined}
      style={{ gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows, gridTemplateAreas: grid.areas }}
    >
      {grid.boxes.map((box, i) => renderBox(i, box, { gridArea: box.area }))}
    </div>
  );
}
