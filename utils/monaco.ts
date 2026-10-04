import type * as Monaco from "monaco-editor";

type WorkerModule = { default: new (options?: { name?: string }) => Worker };

// Monaco asks for each web worker by label. In 0.57 its own editor worker is a
// bare `new URL(…, import.meta.url)`, which Vite emits without the worker's
// imports, so the worker fails with uncaught errors (0.55 ran it on the main
// thread). Vite bundles `?worker` imports completely; each loads on first use.
const editorWorker = () => import("monaco-editor/editor/editor.worker?worker");
const languageWorkers: Record<string, () => Promise<WorkerModule>> = {
  css: () => import("monaco-editor/languages/features/css/css.worker?worker"),
  html: () => import("monaco-editor/languages/features/html/html.worker?worker"),
  json: () => import("monaco-editor/languages/features/json/json.worker?worker"),
  typescript: () => import("monaco-editor/languages/features/typescript/ts.worker?worker"),
};
const workerLabels: Record<string, string> = {
  scss: "css",
  less: "css",
  handlebars: "html",
  razor: "html",
  javascript: "typescript",
};

/** Loads Monaco for the code editors, with workers the build can serve. */
export async function loadMonaco(): Promise<typeof Monaco> {
  globalThis.MonacoEnvironment ??= {
    async getWorker(_workerId, label) {
      const load = languageWorkers[workerLabels[label] ?? label] ?? editorWorker;
      const { default: LabelWorker } = await load();
      return new LabelWorker({ name: label });
    },
  };
  return await import("monaco-editor");
}
