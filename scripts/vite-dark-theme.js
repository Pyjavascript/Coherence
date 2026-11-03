// Dark theme, derived from the light stylesheets.
//
// The light theme is the hand-made one: most of its colours are written
// straight into the rules. Rather than keep a second copy of every rule by
// hand, this plugin reads each stylesheet under src/styles as Vite loads it and
// appends a dark twin of every rule that sets a colour:
//
//   .card { background: #fff; color: #0e1646 }
//   :root[data-theme="dark"] .card { background: #1b1b1f; color: #ececf0 }
//
// The twin is scoped to <html data-theme="dark">, so the light theme is
// untouched. Every twin gains the same specificity and keeps its rule's order,
// so the cascade (hover beats rest, .is-on beats hover...) is unchanged.
//
// Colours are mapped by what the property paints: surfaces turn dark,
// text and icons turn light, hairlines become faint white lines, shadows turn
// black, and saturated brand colours (blue, green, red...) stay as they are.
// Hand-tuned overrides live in src/styles/theme-dark.css, which this plugin
// skips.
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const DARK = ':root[data-theme="dark"]';
const STYLES = /[\\/]src[\\/]styles[\\/].+\.css$/;
const SKIP = /theme-dark\.css$/;

// ---------- colour maths ------------------------------------------------------

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

function parseHex(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return null;
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

function parseRgb(body) {
  const parts = body.replace(/\s*\/\s*/, " / ").replace(/,/g, " ").trim().split(/\s+/);
  const slash = parts.indexOf("/");
  const nums = slash === -1 ? parts : parts.slice(0, slash);
  const alpha = slash === -1 ? nums[3] : parts[slash + 1];
  const ch = (v) => (v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v) / 255);
  const a = alpha == null ? 1 : alpha.endsWith("%") ? parseFloat(alpha) / 100 : parseFloat(alpha);
  if (nums.length < 3 || nums.slice(0, 3).some((v) => Number.isNaN(parseFloat(v)))) return null;
  return { r: ch(nums[0]), g: ch(nums[1]), b: ch(nums[2]), a };
}

function toHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const c = max - min;
  if (!c) return { h: 0, s: 0, l, c };
  const s = c / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / c) % 6;
  else if (max === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  return { h: (h * 60 + 360) % 360, s, l, c };
}

function fromHsl(h, s, l, a) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: r + m, g: g + m, b: b + m, a };
}

// A colour at lightness l whose chroma (colourfulness) is `chroma`.
const withChroma = (h, l, chroma, a) => {
  const room = 1 - Math.abs(2 * l - 1);
  return fromHsl(h, room ? clamp(chroma / room) : 0, l, a);
};

const rgba = (r, g, b, a) => ({ r: r / 255, g: g / 255, b: b / 255, a });

function format({ r, g, b, a }) {
  const to = (v) => Math.round(clamp(v) * 255);
  if (a >= 1) return "#" + [r, g, b].map((v) => to(v).toString(16).padStart(2, "0")).join("");
  return `rgb(${to(r)} ${to(g)} ${to(b)} / ${+clamp(a).toFixed(3)})`;
}

// Saturated mid-tones are the brand's colours: keep them.
const isAccent = ({ c, l }) => c > 0.28 && l > 0.2 && l < 0.82;

// Surfaces: white cards become the darkest panels; the light tints above
// them become slightly lighter, with half their hue (a red warning tint
// stays reddish). Dark fills (navy active states, tooltips) become a raised
// grey.
function mapBackground(col) {
  const hsl = toHsl(col);
  const { h, l, c } = hsl;
  const { a } = col;
  if (isAccent(hsl)) return a < 1 ? { ...col, a: clamp(a * 1.5) } : col;
  if (l >= 0.7) {
    // Faint white washes over coloured things are highlights: keep them.
    if (a < 0.3 && l > 0.9) return { ...col, a: a * 0.6 };
    return withChroma(h, 0.105 + (1 - l) * 1.4, c * 0.5, a);
  }
  if (l < 0.22) {
    if (a < 0.3) return rgba(255, 255, 255, clamp(a * 1.1));
    if (a < 1) return rgba(0, 0, 0, clamp(a * 1.3, 0, 0.85));
    return withChroma(h, 0.24 + l * 0.25, c * 0.15, a);
  }
  return withChroma(h, 0.14 + (0.7 - l) * 0.35, c * 0.4, a);
}

// Text and icons: dark ink becomes light ink; lighter greys (secondary text,
// hints) become dimmer greys, keeping their order. White stays white.
function mapText(col) {
  const hsl = toHsl(col);
  const { h, l, c } = hsl;
  if (c > 0.25 && l >= 0.4) {
    // Coloured text: lift dark shades so they read on a dark surface.
    return l < 0.68 ? withChroma(h, 0.7, Math.min(c, 0.55), col.a) : col;
  }
  if (l >= 0.93) return col;
  const target = l < 0.3 ? 0.93 : 0.85 - ((l - 0.3) / 0.63) * 0.5;
  return withChroma(h, target, Math.min(c, 0.05), col.a);
}

// Lines: light hairlines become faint white lines; tinted rings (focus)
// keep their hue.
function mapBorder(col) {
  const hsl = toHsl(col);
  const { h, s, l, c } = hsl;
  const { a } = col;
  if (isAccent(hsl)) return col;
  // A solid white edge on a white card is a gap, not a line: match the surface.
  if (l >= 0.98 && a >= 1) return mapBackground(col);
  if (l >= 0.7) {
    if (c >= 0.15) return fromHsl(h, Math.min(s, 0.6), 0.45, a);
    return rgba(255, 255, 255, clamp((0.07 + (1 - l) * 0.5) * a));
  }
  if (l < 0.3) return rgba(255, 255, 255, a < 1 ? clamp(a * 1.4) : 0.2);
  return withChroma(h, 1 - l, c * 0.4, a);
}

// Shadows: navy-tinted shadows become deeper black ones. A solid white ring
// (used as a gap around a badge) becomes the surface colour.
function mapShadow(col) {
  const hsl = toHsl(col);
  if (isAccent(hsl)) return col;
  if (hsl.l < 0.45) return rgba(0, 0, 0, clamp(col.a * 2.2, 0, 0.8));
  if (col.a >= 1) return mapBackground(col);
  return { ...col, a: col.a * 0.3 };
}

const MAPPERS = { bg: mapBackground, text: mapText, border: mapBorder, shadow: mapShadow };

// ---------- which colour a property paints ----------------------------------

function roleOf(prop) {
  const p = prop.toLowerCase();
  if (p.startsWith("--")) {
    if (/ink|text|fg|icon|muted|hint|label|title/.test(p)) return "text";
    if (/line|border|stroke|ring|rule/.test(p)) return "border";
    if (/shadow|glow/.test(p)) return "shadow";
    return "bg";
  }
  if (/^(color|fill|stroke|caret-color|stop-color|-webkit-text-fill-color|text-decoration(-color)?|text-emphasis-color)$/.test(p)) return "text";
  if (/^background(-color|-image)?$/.test(p)) return "bg";
  // Not border-radius / -width / -style: only the properties that carry a colour.
  if (/^(border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|column-rule(-color)?)$/.test(p)) return "border";
  if (/^(box-shadow|text-shadow|filter)$/.test(p)) return "shadow";
  return null;
}

const COLOR = /#[0-9a-f]{3,8}\b|rgba?\(([^()]*)\)|(?<![\w-])(white|black)(?![\w-])/gi;
const SINGLE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^()]*\)|white|black)$/i;

// ---------- colour variables -------------------------------------------------
// A variable that holds one colour and is set in one place (--shell-navy,
// --shell-ink...) paints text in one rule and a fill in the next. Twins
// inline its light value, so each use is mapped by what it paints rather than
// by the variable's name.

let palette = { stamp: "", vars: new Map(), colorProps: new Set() };

function readPalette(dir) {
  const files = fs.readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith(".css") && !SKIP.test(f))
    .map((f) => path.join(dir, f));
  const stamp = files.map((f) => f + fs.statSync(f).mtimeMs).join("|");
  if (stamp === palette.stamp) return palette;

  const seen = new Map();
  for (const file of files) {
    postcss.parse(fs.readFileSync(file, "utf8")).walkDecls(/^--/, (decl) => {
      if (/data-theme/.test(decl.parent?.selector || "")) return;
      const list = seen.get(decl.prop) || [];
      list.push(decl.value.trim());
      seen.set(decl.prop, list);
    });
  }
  const resolve = (value, depth = 0) => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (!ref) return SINGLE_COLOR.test(value) ? value : null;
    const defs = seen.get(ref[1]);
    return depth < 8 && defs && new Set(defs).size === 1 ? resolve(defs[0], depth + 1) : null;
  };
  const vars = new Map();
  for (const [name, defs] of seen) {
    const color = new Set(defs).size === 1 && resolve(defs[0]);
    if (color) vars.set(name, color);
  }
  // Variables that ever hold a colour: their resets get twins too (below).
  const hasColor = new RegExp(COLOR.source, "i");
  const colorProps = new Set([...seen].filter(([, defs]) => defs.some((d) => hasColor.test(d) || /var\(/.test(d))).map(([name]) => name));
  palette = { stamp, vars, colorProps };
  return palette;
}

const inlineVars = (value, vars) =>
  value.includes("var(") ? value.replace(/var\((--[\w-]+)\)/g, (m, name) => vars.get(name) || m) : value;

// Rewrite every colour in a value; null when the value has none.
function darkValue(value, role, vars) {
  value = inlineVars(value, vars);
  if (/url\(/i.test(value)) value = value.replace(/url\([^)]*\)/gi, (u) => u.replace(/#/g, "\u0000"));
  let found = false;
  const out = value.replace(COLOR, (match, rgbBody, named) => {
    const col = named
      ? named.toLowerCase() === "white" ? rgba(255, 255, 255, 1) : rgba(0, 0, 0, 1)
      : rgbBody != null ? parseRgb(rgbBody) : parseHex(match);
    if (!col) return match;
    found = true;
    return format(MAPPERS[role](col));
  });
  return found ? out.replace(/\u0000/g, "#") : null;
}

// ---------- the twin rules ---------------------------------------------------

function darkSelector(sel) {
  const s = sel.trim();
  if (/^:root\b/.test(s)) return s.replace(/^:root/, DARK);
  if (/^html\b/.test(s)) return s.replace(/^html/, 'html[data-theme="dark"]');
  return `${DARK} ${s}`;
}

function inKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

// Every colour declaration gets a twin, even one with no colour in it
// (`border-bottom: 0`, `background: none`): twins outrank the light rules, so
// a reset left out would lose to the twin of the rule it was resetting.
export function buildDarkCss(css, from, { vars, colorProps }) {
  const root = postcss.parse(css, { from });
  const out = postcss.root();

  root.walkRules((rule) => {
    if (inKeyframes(rule) || /data-theme/.test(rule.selector)) return;
    const decls = [];
    rule.each((node) => {
      if (node.type !== "decl") return;
      const role = roleOf(node.prop);
      if (!role || (node.prop.startsWith("--") && !colorProps.has(node.prop))) return;
      const value = darkValue(node.value, role, vars);
      decls.push(value == null ? node.clone() : node.clone({ value }));
    });
    if (!decls.length) return;

    let twin = postcss.rule({ selectors: rule.selectors.map(darkSelector) });
    decls.forEach((d) => twin.append(d));
    // Keep the rule's @media / @container / @supports wrappers.
    for (let p = rule.parent; p && p.type === "atrule"; p = p.parent) {
      const wrap = postcss.atRule({ name: p.name, params: p.params });
      wrap.append(twin);
      twin = wrap;
    }
    out.append(twin);
  });

  return out.nodes.length ? out.toString() : "";
}

export default function darkTheme() {
  return {
    name: "dark-theme",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!STYLES.test(file) || SKIP.test(file)) return null;
      const dark = buildDarkCss(code, file, readPalette(file.slice(0, file.search(STYLES) + "/src/styles".length)));
      if (!dark) return null;
      return { code: `${code}\n\n/* ---- dark theme (generated by scripts/vite-dark-theme.js) ---- */\n${dark}\n`, map: null };
    },
  };
}
