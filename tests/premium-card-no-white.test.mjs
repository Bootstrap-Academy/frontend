// The buttons of the Premium card carry no white surface; read from the template and the theme only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** Every element of a template, each with the elements it stands in. */
function elements(root) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
    for (const branch of node.branches ?? []) visit(branch, parents);
  })(root, []);
  return found;
}
const attribute = (node, name) => node.props.find((p) => p.name === name)?.value?.content;
const bound = (node, name) => node.props.find((p) => p.arg?.content === name)?.exp?.content;

// The colours of the interface, as the stylesheet defines them.
const stylesheet = await read("assets/css/tailwind.css");
const theme = Object.fromEntries(
  [...stylesheet.matchAll(/--color-([a-z]+): (#[0-9a-f]{6})([0-9a-f]{2})?;/g)].map((m) => [
    m[1],
    { hex: m[2], opaque: (m[3] ?? "ff") === "ff" },
  ])
);

/** Contrast of two colours after WCAG 2. */
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const all = elements(parse(await read("components/subscription/card.vue")).descriptor.template.ast);
const card = all.find(({ node }) => attribute(node, "id") === "premium").node;
const within = (outer) => all.filter(({ parents }) => parents.includes(outer));

/** The classes of an element. A computed class would hide what the element looks like. */
function classes(node) {
  assert.equal(bound(node, "class"), undefined, node.loc.source.split("\n")[0]);
  return (attribute(node, "class") ?? "").split(/\s+/).filter(Boolean);
}
/** The theme colours an element names for `kind` ("bg", "border", "text"), in every state. */
const named = (node, kind) =>
  classes(node)
    .map((c) => c.match(new RegExp(`^(?:[a-z-]+:)*${kind}-([a-z]+)$`))?.[1])
    .filter((name) => name in theme);

/** What a button of the card looks like: its fill, its rim and every colour its text takes. */
function look(button) {
  const [fill, ...moreFills] = named(button, "bg");
  const rims = named(button, "border");
  assert(fill && moreFills.length === 0, "the button has one fill in every state");
  const texts = new Set(named(button, "text"));
  // Whatever writes inside the button takes its colour from itself or from an element around
  // it, up to the button. Nothing may fall back to the black text of the card.
  for (const { node, parents } of within(button)) {
    const writes =
      node.tag === "Price" ||
      node.children.some((child) => child.type === 5 || (child.type === 2 && child.content.trim()));
    if (!writes) continue;
    const chain = [node, ...parents.slice(parents.indexOf(button)).reverse()];
    const colours = chain.map((element) => named(element, "text")).find((list) => list.length);
    assert(colours, `no text colour for ${node.loc.source.split("\n")[0]}`);
    for (const name of colours) texts.add(name);
  }
  assert(texts.size > 0, "the button has a label");
  return { fill, rims, texts: [...texts] };
}

/** White as a surface: fills, rims, rings and the like. White text is no surface. */
const WHITE_SURFACE =
  /(?<![\w-])(?:[a-z-]+:)*(?:bg|border|ring|outline|divide|from|via|to|shadow)-white(?:\/\d+)?(?![\w-])/g;

function assertFitsTheCard(button, what) {
  assert.deepEqual(button.loc.source.match(WHITE_SURFACE) ?? [], [], `${what}: white surface`);
  const { fill, rims, texts } = look(button);
  assert(theme[fill].opaque, `${what}: the fill covers the card`);
  // Far from white, and a clear figure on the accent colour of the card.
  assert(contrast(theme[fill].hex, theme.white.hex) >= 4.5, `${what}: ${fill} is close to white`);
  assert(contrast(theme[fill].hex, theme.accent.hex) >= 3, `${what}: ${fill} on the card`);
  for (const rim of rims)
    assert(
      contrast(theme[rim].hex, theme.white.hex) >= 4.5,
      `${what}: rim ${rim} is close to white`
    );
  for (const text of texts)
    assert(contrast(theme[text].hex, theme[fill].hex) >= 4.5, `${what}: ${text} on ${fill}`);
  return { fill, rims, texts };
}

test("without enough Morphcoins the button of the Premium card is no white surface", () => {
  assert.match(attribute(card, "class"), /\bbg-accent\b/, "the card is the accent surface");
  const toCoinOrder = within(card).filter(
    ({ node }) => node.tag === "NuxtLink" && bound(node, "to") === "coinOrder"
  );
  assert.equal(toCoinOrder.length, 1);
  const { fill, texts } = assertFitsTheCard(toCoinOrder[0].node, "the way to the coin order");
  // The main button of the dark pages the other way round: page colour, labelled in accent.
  assert.equal(fill, "primary");
  assert.deepEqual(texts, ["accent"]);
});
