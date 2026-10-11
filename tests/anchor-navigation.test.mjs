import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const transpile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const middlewareSource = await source("../middleware/route.global.ts");
const pluginSource = await source("../plugins/anchor.client.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The global middleware with the timer and the window it would use in a browser. */
function middleware(client = true) {
  const timers = [],
    scrolls = [];
  const context = {
    guestReturnPath: () => null,
    useAppCookie: () => ({ value: null }),
    navigateTo: (path) => ({ path }),
    defineNuxtRouteMiddleware: (handler) => handler,
    setTimeout: (handler, delay) => timers.push({ handler, delay }),
    window: { scrollTo: (options) => scrolls.push(plain(options)) },
  };
  runInNewContext(
    transpile(middlewareSource)
      .replace(/^import .*;\n/gm, "")
      // Nuxt replaces this compile-time flag before the middleware is executed.
      .replaceAll("import.meta.client", JSON.stringify(client))
      .replace("export default", "result ="),
    context
  );
  return { visit: context.result, timers, scrolls };
}
const at = (path, hash = "") => ({ path, hash });

test("a new page without an anchor still starts at the top", () => {
  for (const [to, from] of [
    [at("/docs/imprint"), at("/contact")],
    [at("/contact"), at("/docs/privacy", "#aenderungen")],
    [at("/dashboard"), at("/auth/login")],
  ]) {
    const f = middleware();
    assert.equal(f.visit(to, from), undefined);
    assert.deepEqual(
      f.timers.map((timer) => timer.delay),
      [450]
    );
    assert.deepEqual(f.scrolls, [], "nothing moves before the page has changed");
    f.timers[0].handler();
    assert.deepEqual(f.scrolls, [{ top: 0, left: 0, behavior: "smooth" }]);
  }
});

test("a target with an anchor is left to the router and never sent back to the top", () => {
  for (const [to, from] of [
    [at("/docs/privacy", "#aenderungen"), at("/dashboard")],
    [at("/docs/privacy", "#kommunikation"), at("/contact")],
    [at("/docs/terms-and-conditions", "#ziffer-14"), at("/docs/imprint")],
  ]) {
    const f = middleware();
    assert.equal(f.visit(to, from), undefined);
    assert.deepEqual(f.timers, [], to.path + to.hash);
    assert.deepEqual(f.scrolls, []);
  }
});

test("staying on a page never moves it, with or without an anchor, and the server has no window", () => {
  for (const [to, from] of [
    [at("/docs/privacy", "#statistiken"), at("/docs/privacy")],
    [at("/docs/privacy"), at("/docs/privacy", "#statistiken")],
    [at("/dashboard"), at("/dashboard")],
  ]) {
    const f = middleware();
    f.visit(to, from);
    assert.deepEqual(f.timers, [], to.path + to.hash);
  }
  const server = middleware(false);
  server.visit(at("/docs/imprint"), at("/contact"));
  assert.deepEqual(server.timers, []);
});

/** The plugin with the page, the window and the observer it would meet in a browser. */
function opened(hash, ids = []) {
  const hooks = [],
    lookups = [],
    scrolls = [],
    observers = [],
    listeners = new Map();
  // `top` is where the section stands in the window; going to it puts it at `rest`.
  const sections = Object.fromEntries(
    ids.map((id) => {
      const section = {
        id,
        isConnected: true,
        top: 900,
        rest: 0,
        scrollIntoView(options) {
          scrolls.push([id, options]);
          section.top = section.rest;
        },
        getBoundingClientRect: () => ({ top: section.isConnected ? section.top : 0 }),
      };
      return [id, section];
    })
  );
  const route = { hash };
  const document = {
    body: { tag: "body" },
    getElementById(id) {
      lookups.push(id);
      return sections[id] ?? null;
    },
  };
  class ResizeObserver {
    constructor(changed) {
      Object.assign(this, { changed, watched: [], connected: true });
      observers.push(this);
    }
    observe(target) {
      this.watched.push(target);
    }
    disconnect() {
      this.connected = false;
    }
  }
  const window = {
    addEventListener: (type, handler, options) => listeners.set(type, { handler, options }),
    removeEventListener: (type, handler) => {
      assert.equal(listeners.get(type)?.handler, handler);
      listeners.delete(type);
    },
  };
  new Function(
    "defineNuxtPlugin",
    "useRouter",
    "document",
    "window",
    "ResizeObserver",
    transpile(pluginSource).replace(/^export default /m, "return ")
  )(
    (setup) => setup({ hooks: { hookOnce: (name, handler) => hooks.push({ name, handler }) } }),
    () => ({ currentRoute: { value: route } }),
    document,
    window,
    ResizeObserver
  );
  const scrolled = () => listeners.get("scroll")?.handler();
  return { hooks, lookups, scrolls, observers, listeners, route, document, sections, scrolled };
}
const jump = (id) => [id, { behavior: "instant" }];

test("an address with an anchor opened directly shows its section once the first page stands", () => {
  const f = opened("#aenderungen", ["aenderungen", "statistiken"]);
  assert.deepEqual(
    f.hooks.map((hook) => hook.name),
    ["page:finish"]
  );
  assert.deepEqual(f.lookups, [], "the page is not there yet when the app starts");
  f.hooks[0].handler();
  assert.deepEqual(f.lookups, ["aenderungen"]);
  assert.deepEqual(f.scrolls, [jump("aenderungen")]);
});

test("the section is followed while the page still grows", () => {
  const f = opened("#aenderungen", ["aenderungen"]);
  const section = f.sections.aenderungen;
  // The page ends too early for the section to reach the top: the footer is still missing.
  section.rest = 154;
  f.hooks[0].handler();
  assert.equal(f.observers.length, 1);
  assert.deepEqual(f.observers[0].watched, [f.document.body]);
  assert.deepEqual(f.listeners.get("scroll").options, { passive: true });
  f.scrolled();
  assert.equal(f.observers[0].connected, true, "the jump itself is no move of the reader");
  // The footer arrives and makes room for the rest of the way.
  section.rest = 7;
  f.observers[0].changed();
  f.scrolled();
  // A font arrives and pushes the section down without any scrolling.
  section.top = 300;
  f.observers[0].changed();
  assert.equal(section.top, 7);
  assert.deepEqual(f.scrolls, Array(3).fill(jump("aenderungen")));
  assert.equal(f.observers[0].connected, true);
  assert.equal(f.listeners.has("scroll"), true);
});

test("the page belongs to the reader as soon as they move it or leave it", () => {
  const moves = opened("#aenderungen", ["aenderungen"]);
  moves.hooks[0].handler();
  moves.sections.aenderungen.top = -480;
  moves.scrolled();
  assert.equal(moves.observers[0].connected, false);
  assert.equal(moves.listeners.has("scroll"), false);
  assert.deepEqual(moves.scrolls, [jump("aenderungen")], "nothing pulls the page back");

  for (const event of ["changed", "scrolled"]) {
    const leaves = opened("#aenderungen", ["aenderungen"]);
    leaves.hooks[0].handler();
    // The next page replaces the section.
    leaves.sections.aenderungen.isConnected = false;
    if (event === "changed") leaves.observers[0].changed();
    else leaves.scrolled();
    assert.equal(leaves.observers[0].connected, false, event);
    assert.equal(leaves.listeners.has("scroll"), false, event);
    assert.deepEqual(leaves.scrolls, [jump("aenderungen")], event);
  }
});

test("without an anchor, or with one that names no section, nothing is moved or watched", () => {
  for (const [hash, lookups] of [
    ["", []],
    ["#no-such-section", ["no-such-section"]],
    ["#capability=abc", ["capability=abc"]],
  ]) {
    const f = opened(hash, ["aenderungen"]);
    f.hooks[0].handler();
    assert.deepEqual(f.lookups, lookups);
    assert.deepEqual(f.scrolls, []);
    assert.deepEqual(f.observers, []);
    assert.equal(f.listeners.size, 0);
  }
});

test("the anchor is read when the page stands, after redirects have settled", () => {
  const f = opened("", ["aenderungen"]);
  f.route.hash = "#aenderungen";
  f.hooks[0].handler();
  assert.deepEqual(f.scrolls, [jump("aenderungen")]);
});
