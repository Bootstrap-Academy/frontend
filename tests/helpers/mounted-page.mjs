// Mounts pages and components with their real script and template on an element tree;
// every name they reach resolves to `scope`, then to the runtime, then to a no-op.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import * as Vue from "vue";

const compiled = new Map();

/**
 * Evaluates a file relative to the repository root against `scope`: a component
 * (`<script>` plus template) yields its options object, a module its exports.
 */
export async function evaluate(path, scope) {
  if (!compiled.has(path)) {
    let source = await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
    if (path.endsWith(".vue")) {
      const { descriptor } = parse(source);
      const template = compileTemplate({
        source: descriptor.template.content,
        filename: path,
        id: path,
      });
      assert.deepEqual(template.errors, [], path);
      source = `${descriptor.script.content}\n${template.code}`;
    }
    compiled.set(
      path,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
      }).outputText
    );
  }
  const exports = {};
  const environment = new Proxy(scope, {
    has: () => true,
    get: (target, key) =>
      key === Symbol.unscopables
        ? undefined
        : key === "exports"
          ? exports
          : key in target
            ? target[key]
            : key in globalThis
              ? globalThis[key]
              : () => {},
  });
  new Function("environment", `with (environment) { ${compiled.get(path)} }`)(environment);
  return path.endsWith(".vue") ? { ...exports.default, render: exports.render } : exports;
}

/** A stand-in child that renders one element with everything it was given. */
export const tag =
  (name) =>
  (props, { slots }) =>
    Vue.h(name, props, slots.default?.());

/** Element tree that keeps every element and text ever written to it, so a passing state cannot hide. */
export function host() {
  const said = [];
  const node = (type, text = "") => {
    if (type !== "comment") said.push(text);
    return {
      type,
      text,
      props: {},
      children: [],
      parent: null,
      // What `v-model` on a select and a form's validation touch.
      options: [],
      selectedIndex: -1,
      addEventListener() {},
      reportValidity: () => true,
    };
  };
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
    n.parent = null;
  };
  const write = (n, text) => {
    said.push(text);
    n.text = text;
  };
  const renderer = Vue.createRenderer({
    createElement: (type) => {
      said.push(`<${type}>`);
      return node(type);
    },
    createText: (text) => node("text", text),
    createComment: (text) => node("comment", text),
    setText: write,
    setElementText: (n, text) => {
      write(n, text);
      n.children = [];
    },
    patchProp: (n, key, _old, value) => {
      if (key === "id") said.push(`#${value}`);
      n.props[key] = value;
    },
    insert: (n, parent, anchor = null) => {
      detach(n);
      n.parent = parent;
      parent.children.splice(
        anchor ? parent.children.indexOf(anchor) : parent.children.length,
        0,
        n
      );
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root");
  const all = (n = root) => [n, ...n.children.flatMap(all)];
  const text = (n = root) =>
    n.type === "comment" ? "" : [n.text, ...n.children.map(text)].join(" ");
  return { root, renderer, all, text, ever: (what) => said.some((s) => s.includes(what)) };
}

/** Lets pending answers, watchers and renders run. */
export async function settle() {
  for (let turn = 0; turn < 5; turn++) {
    await new Promise(setImmediate);
    await Vue.nextTick();
  }
}
