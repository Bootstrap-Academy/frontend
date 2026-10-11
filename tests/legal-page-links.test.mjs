// Every text link of a legal page carries exactly one line, its underline, and the entries
// of a table of contents carry none. The lines are counted from the rules that take effect
// on each link: the style block of the page and the shared stylesheet. A class on a link
// is therefore seen with what it draws.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import postcss from "postcss";
import { parse } from "@vue/compiler-sfc";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const PAGES = [
  "pages/docs/privacy.vue",
  "pages/docs/terms-and-conditions.vue",
  "pages/docs/right-of-withdrawal.vue",
];
const SHARED = "assets/css/tailwind.css";

/** The elements of a template, each knowing its parent and the elements before it. */
function elements(ast) {
  const all = [];
  (function visit(node, parent) {
    const before = [];
    for (const child of node.children ?? []) {
      if (child.type !== 1) continue;
      const attribute = (name) => child.props.find((p) => p.type === 6 && p.name === name);
      const element = {
        // A NuxtLink renders an anchor.
        tag: child.tag === "NuxtLink" ? "a" : child.tag,
        id: attribute("id")?.value?.content ?? null,
        classes: new Set((attribute("class")?.value?.content ?? "").split(/\s+/).filter(Boolean)),
        attributes: new Map(
          child.props
            .filter((p) => p.type === 6)
            .map((p) => [p.name === "to" ? "href" : p.name, p.value?.content ?? ""])
        ),
        boundClass: child.props.some((p) => p.type === 7 && p.arg?.content === "class"),
        parent,
        before: [...before],
        source: child.loc.source.replace(/\s+/g, " ").slice(0, 90),
        text: "",
      };
      element.text = (function text(n) {
        return (n.children ?? []).map((c) => (c.type === 2 ? c.content : text(c))).join("");
      })(child)
        .replace(/\s+/g, " ")
        .trim();
      all.push(element);
      before.push(element);
      visit(child, element);
    }
  })(ast, null);
  return all;
}
const ancestors = (element) =>
  element.parent ? [element.parent, ...ancestors(element.parent)] : [];

/** The rules of a stylesheet with what each of them says about a line under a link. */
function rules(css, page) {
  const out = [];
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name.endsWith("keyframes")) return;
    const declared = {},
      applied = [];
    rule.each((node) => {
      if (node.type === "decl") declared[node.prop] = node.value.trim();
      // Variants such as `hover:` do not describe the link at rest.
      if (node.type === "atrule" && node.name === "apply")
        applied.push(...node.params.split(/\s+/).filter((utility) => !utility.includes(":")));
    });
    const says = {};
    const decoration = declared["text-decoration-line"] ?? declared["text-decoration"];
    if (applied.includes("underline") || /\bunderline\b/.test(decoration ?? ""))
      says.underline = true;
    if (applied.includes("no-underline") || /^none\b/.test(decoration ?? ""))
      says.underline = false;
    const border = declared["border-bottom-width"] ?? declared["border-bottom"];
    if (
      applied.some((utility) => /^border-b(-\d+)?$/.test(utility)) ||
      (border && !/^(0|none)\b/.test(border))
    )
      says.border = true;
    if (applied.includes("border-b-0") || /^(0|none)\b/.test(border ?? "")) says.border = false;
    // On a pseudo-element the content decides whether anything is drawn at all.
    if ("content" in declared) says.content = declared.content !== "none";
    for (const selector of rule.selectors) out.push({ selector, says, page, order: out.length });
  });
  return out;
}

const STATES = new Set(["hover", "focus", "focus-visible", "focus-within", "active", "visited"]);
const COMPOUND = /^(\*|[a-zA-Z][\w-]*)?((?:#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?)*)$/;

/** Splits a selector into its compounds, each with the combinator that leads to it. */
function compounds(selector) {
  const parts = [];
  let combinator = " ";
  for (const token of selector.trim().match(/\s*[>+~]\s*|\s+|[^\s>+~]+/g) ?? []) {
    if (/^\s*[>+~]?\s*$/.test(token)) {
      combinator = token.trim() || " ";
      continue;
    }
    const found = token.match(COMPOUND);
    if (!found) return null;
    const pieces = found[2].match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?/g) ?? [];
    parts.push({
      combinator,
      tag: found[1] ?? "*",
      id: pieces.find((p) => p.startsWith("#"))?.slice(1) ?? null,
      classes: pieces.filter((p) => p.startsWith(".")).map((p) => p.slice(1)),
      attributes: pieces.filter((p) => p.startsWith("[")),
      pseudo: pieces.filter((p) => p.startsWith(":")).map((p) => p.replace(/^::?/, "")),
    });
    combinator = " ";
  }
  return parts;
}

function fits(part, element) {
  if (part.tag !== "*" && part.tag !== element.tag) return false;
  if (part.id && part.id !== element.id) return false;
  if (!part.classes.every((name) => element.classes.has(name))) return false;
  return part.attributes.every((text) => {
    const [, name, operator, value] =
      text.match(/^\[([\w-]+)(?:([\^$*]?=)"?([^"\]]*)"?)?\]$/) ?? [];
    assert(name, `this test cannot read the attribute selector ${text}`);
    if (!element.attributes.has(name)) return false;
    const actual = element.attributes.get(name);
    if (!operator) return true;
    if (operator === "=") return actual === value;
    if (operator === "^=") return actual.startsWith(value);
    if (operator === "$=") return actual.endsWith(value);
    return actual.includes(value);
  });
}

/**
 * Whether a selector applies to a link at rest. Answers with the pseudo-element it is
 * about, if any, and its specificity. A selector this test cannot judge fails the test as
 * soon as it could reach a link.
 */
function reaches(rule, link) {
  const parts = compounds(rule.selector);
  const subject = parts?.at(-1);
  if (parts && !fits({ ...subject, attributes: [] }, link)) return null;
  assert(parts, `this test cannot read the selector "${rule.selector}"`);
  let element = null;
  const pseudoElements = [];
  for (const part of parts)
    for (const pseudo of part.pseudo) {
      // `:root` is the document, and the states are no link at rest.
      if (pseudo === "root" || STATES.has(pseudo)) return null;
      if (part === subject && (pseudo === "after" || pseudo === "before"))
        pseudoElements.push(pseudo);
      // Selections and scrollbars draw no line under a link.
      else if (part === subject && (pseudo === "selection" || pseudo.startsWith("-webkit-")))
        return null;
      else assert.fail(`this test cannot judge ":${pseudo}" in "${rule.selector}" on a link`);
    }
  function walk(index, candidate) {
    const part = parts[index];
    if (!fits(part, candidate)) return false;
    if (index === 0) return true;
    const next = (other) => !!other && walk(index - 1, other);
    if (part.combinator === ">") return next(candidate.parent);
    if (part.combinator === "+") return next(candidate.before.at(-1));
    if (part.combinator === "~") return candidate.before.some(next);
    return ancestors(candidate).some(next);
  }
  if (!walk(parts.length - 1, link)) return null;
  element = pseudoElements[0] ?? null;
  const specificity = [0, 0, 0];
  for (const part of parts) {
    if (part.id) specificity[0]++;
    specificity[1] += part.classes.length + part.attributes.length;
    if (part.tag !== "*") specificity[2]++;
  }
  specificity[2] += pseudoElements.length;
  // A scoped style block adds an attribute to the last compound of each of its selectors.
  if (rule.page) specificity[1]++;
  return { pseudoElement: element, rank: [...specificity, rule.page ? 1 : 0, rule.order] };
}
/** Whether rank `a` wins over rank `b`: by specificity, then page over shared, then order. */
function later(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** The lines a link carries at rest: its underline, a border, and what a pseudo-element draws. */
function lines(link, sheet) {
  const winner = {};
  for (const rule of sheet) {
    const reach = reaches(rule, link);
    if (!reach) continue;
    for (const [key, value] of Object.entries(rule.says)) {
      if ((key === "content") !== !!reach.pseudoElement) continue;
      const slot = reach.pseudoElement ? "::" + reach.pseudoElement : key;
      if (!winner[slot] || later(reach.rank, winner[slot].rank))
        winner[slot] = { value, rank: reach.rank, selector: rule.selector };
    }
  }
  return Object.entries(winner)
    .filter(([, { value }]) => value)
    .map(([slot, { selector }]) => `${slot} from "${selector}"`)
    .sort();
}

const shared = rules(await read(SHARED), false);
const sharedClasses = new Set(
  shared.flatMap((rule) => (compounds(rule.selector) ?? []).flatMap((part) => part.classes))
);
/** A table of contents: the list marked as one, or the list right below the heading "Inhalt". */
const inContents = (link) =>
  ancestors(link).some(
    (element) =>
      element.classes.has("table-content") ||
      (["ul", "ol"].includes(element.tag) &&
        element.before.at(-1)?.tag === "h2" &&
        element.before.at(-1).text === "Inhalt")
  );

async function page(path) {
  const { descriptor } = parse(await read(path));
  const sheet = [
    ...shared,
    ...descriptor.styles.flatMap((style) => {
      assert(style.scoped, `${path}: the style block is scoped`);
      return rules(style.content, true);
    }),
  ];
  const links = elements(descriptor.template.ast).filter((element) => element.tag === "a");
  for (const link of links) {
    assert(
      !link.boundClass,
      `${path}: a link with a computed class cannot be judged: ${link.source}`
    );
    // A class this test knows nothing about could draw anything.
    for (const name of link.classes)
      assert(
        sharedClasses.has(name),
        `${path}: teach this test what ".${name}" draws: ${link.source}`
      );
  }
  return {
    sheet,
    contents: links.filter(inContents),
    text: links.filter((link) => !inContents(link)),
  };
}

test("the count sees a class that draws a second line under a link", async () => {
  // The state this test was written against: the page underlines its links, and some of
  // them carry `underline-link`, whose shared rule draws a line of its own.
  const underlined = rules("a { @apply underline; }", true);
  const [plain, classed] = elements(
    parse(
      '<template><p><a href="/a">a</a> <a href="/b" class="underline-link">b</a></p></template>'
    ).descriptor.template.ast
  ).filter((element) => element.tag === "a");
  assert.deepEqual(lines(plain, [...shared, ...underlined]), ['underline from "a"']);
  assert.deepEqual(lines(classed, [...shared, ...underlined]), [
    '::after from ".underline-link::after"',
    'underline from "a"',
  ]);
  // Taking the drawn line away again leaves the underline alone.
  const single = rules("a { @apply underline; } a.underline-link::after { content: none; }", true);
  assert.deepEqual(lines(classed, [...shared, ...single]), ['underline from "a"']);
  // A more specific rule wins over a later one, a later one over an equal one.
  const cascade = rules("li a { @apply no-underline; } a { @apply underline; }", true);
  const [inList] = elements(
    parse('<template><ul><li><a href="#x">x</a></li></ul></template>').descriptor.template.ast
  ).filter((element) => element.tag === "a");
  assert.deepEqual(lines(inList, cascade), []);
  assert.deepEqual(
    lines(inList, rules("a { @apply no-underline; } a { @apply underline; }", true)),
    ['underline from "a"']
  );
});

for (const path of PAGES) {
  test(`${path}: no text link carries more than one line, and each carries its underline`, async () => {
    const { sheet, text } = await page(path);
    const counted = text.map((link) => ({ link, lines: lines(link, sheet) }));
    const describe = (list) =>
      list.map(({ link, lines }) => `${link.source} → ${lines.join(" + ") || "no line"}`);
    const several = counted.filter(({ lines }) => lines.length > 1);
    assert.deepEqual(
      describe(several),
      [],
      `${several.length} of ${text.length} text links carry more than one line`
    );
    const other = counted.filter(
      ({ lines }) => lines.length !== 1 || !lines[0].startsWith("underline ")
    );
    assert.deepEqual(describe(other), [], "every text link is underlined, and nothing else");
  });
}

test("the tables of contents of the legal pages carry no line", async () => {
  const sizes = {};
  for (const path of PAGES) {
    const { sheet, contents } = await page(path);
    sizes[path] = contents.length;
    for (const link of contents)
      assert.deepEqual(lines(link, sheet), [], `${path}: ${link.source}`);
  }
  // The privacy page and the terms each have a table of contents; the right of
  // withdrawal has none.
  assert(sizes["pages/docs/privacy.vue"] > 20, JSON.stringify(sizes));
  assert(sizes["pages/docs/terms-and-conditions.vue"] > 20, JSON.stringify(sizes));
  assert.equal(sizes["pages/docs/right-of-withdrawal.vue"], 0);
});
