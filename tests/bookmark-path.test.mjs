// The address a bookmark is created and deleted at: a main skill alone, or one of its skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "./helpers/mounted-page.mjs";

/** The two functions with a stand-in for the API that records what is asked for. */
async function bookmarks() {
  const calls = [];
  const quiet = { log() {}, error() {} };
  const { createBookmark, deleteBookmark } = await evaluate("composables/bookmark.ts", {
    console: quiet,
    POST: async (path) => (calls.push(["POST", path]), {}),
    DELETE: async (path) => (calls.push(["DELETE", path]), true),
  });
  return { calls, createBookmark, deleteBookmark };
}

test("the bookmark of a main skill is asked for at the path of that skill, without a slash at its end", async () => {
  // How a main skill arrives: the skill tree passes an empty second id, other callers none.
  for (const second of [[""], [null], [undefined], []]) {
    const { calls, createBookmark, deleteBookmark } = await bookmarks();
    await createBookmark("web_developer", ...second);
    await deleteBookmark("web_developer", ...second);
    assert.deepEqual(
      calls,
      [
        ["POST", "/skills/bookmark/web_developer"],
        ["DELETE", "/skills/bookmark/web_developer"],
      ],
      JSON.stringify(second)
    );
  }
});

test("the bookmark of a skill inside a main skill keeps its path with both ids", async () => {
  const { calls, createBookmark, deleteBookmark } = await bookmarks();
  await createBookmark("web_developer", "angular");
  await deleteBookmark("web_developer", "angular");
  assert.deepEqual(calls, [
    ["POST", "/skills/bookmark/web_developer/angular"],
    ["DELETE", "/skills/bookmark/web_developer/angular"],
  ]);
});

test("an id is one part of the path, whatever it contains", async () => {
  const { calls, createBookmark, deleteBookmark } = await bookmarks();
  await createBookmark("c/c++", "a b?x#y");
  await deleteBookmark("c/c++");
  assert.deepEqual(calls, [
    ["POST", "/skills/bookmark/c%2Fc%2B%2B/a%20b%3Fx%23y"],
    ["DELETE", "/skills/bookmark/c%2Fc%2B%2B"],
  ]);
});

test("a refused bookmark is still reported to the caller", async () => {
  const quiet = { log() {}, error() {} };
  const { createBookmark, deleteBookmark } = await evaluate("composables/bookmark.ts", {
    console: quiet,
    POST: async () => null,
    DELETE: async () => false,
  });
  await assert.rejects(() => createBookmark("web_developer", ""), /Failed to create bookmark/);
  await assert.rejects(() => deleteBookmark("web_developer", ""), /Failed to delete bookmark/);
});
