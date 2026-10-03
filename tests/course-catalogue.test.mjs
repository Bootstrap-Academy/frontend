import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(new URL("../utils/courseCatalogue.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { courseCatalogueUrl, createCourseCatalogue } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

test("catalogue query preserves server search/recent semantics and safely encodes input", () => {
  assert.equal(courseCatalogueUrl({ recent_first: true }), "/skills/courses?recent_first=true");
  assert.equal(courseCatalogueUrl({ free: true }), "/skills/courses");
  assert.equal(courseCatalogueUrl({ free: true, search_term: "---" }), "/skills/courses");
  const url = new URL(
    courseCatalogueUrl({ free: true, search_term: "C++ & #Python?" }),
    "https://example.org"
  );
  assert.equal(url.searchParams.get("search_term"), "C++ & #Python?");
  assert.equal(url.searchParams.get("free"), "true");
});

test("concurrent consumers share one list without changing free-sort or purchase metadata", async () => {
  const rows = [
    { id: "paid", price: 100, owned: true },
    { id: "free", price: 0, completed: true },
    { id: "other", price: 200, owned: false },
  ];
  let finish;
  const calls = [];
  const load = createCourseCatalogue(
    (url) => {
      calls.push(url);
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    () => "owner-a"
  );
  const plain = load({});
  const free = load({ free: true });
  assert.deepEqual(calls, ["/skills/courses"]);
  finish(rows);
  assert.equal(await plain, rows);
  assert.deepEqual(await free, [rows[1], rows[0], rows[2]]);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["paid", "free", "other"]
  );
});

test("failed requests can retry and a new session never receives an old session's list", async () => {
  let owner = "owner-a";
  let finish;
  let calls = 0;
  const load = createCourseCatalogue(
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    () => owner
  );
  const old = load({});
  owner = "owner-b";
  finish([{ id: "private-progress", price: 0 }]);
  await assert.rejects(old, /session_changed/);
  const current = load({});
  finish([]);
  assert.deepEqual(await current, []);
  assert.equal(calls, 2);
  let attempts = 0;
  const retry = createCourseCatalogue(
    async () => {
      if (++attempts === 1) throw new Error("offline");
      return [];
    },
    () => owner
  );
  await assert.rejects(retry({}), /offline/);
  assert.deepEqual(await retry({}), []);
});
