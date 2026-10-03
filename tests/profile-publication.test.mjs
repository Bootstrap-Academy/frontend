import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(file, bindings, names) {
  const source = (await readFile(new URL(file, import.meta.url), "utf8"))
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/^export /gm, "");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${names.join(",")} };`)(
    ...Object.values(bindings)
  );
}

const publication = await load("../utils/profilePublication.ts", {}, [
  "createProfilePublication",
  "emptyPublicationView",
  "publicationSettings",
  "PUBLICATION_NOTICE",
  "PUBLICATION_NOTICE_HASH",
  "PUBLICATION_NOTICE_DE",
  "PUBLICATION_NOTICE_EN",
  "PUBLICATION_SCOPE",
]);
const leaderboard = await load(
  "../utils/leaderboardPage.ts",
  { PUBLICATION_SCOPE: publication.PUBLICATION_SCOPE },
  ["createLeaderboardPager", "emptyLeaderboardPage", "normalizeLeaderboardPage"]
);
const settings = (visibility = "private", revision = 0) => ({
  profile_visibility: visibility,
  visibility_revision: revision,
});
const later = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};

function fixture({ get, put } = {}) {
  let state = settings();
  let owner = "A:session-A:first";
  const writes = [];
  const reads = [];
  const view = publication.emptyPublicationView();
  const preview = () => ({
    profile: { user_id: "A", display_name: "Preview name", avatar_url: null, email: "private" },
    publication: state,
    scope_version: publication.PUBLICATION_SCOPE,
    notice_hash: publication.PUBLICATION_NOTICE_HASH,
    notice: publication.PUBLICATION_NOTICE,
    preview_token: "owner-bound-preview",
  });
  let changes = 0;
  const controller = publication.createProfilePublication({
    view,
    owner: () => owner,
    userId: () => "A",
    get: async (path) => {
      reads.push(path);
      if (get) return get(path, state, preview);
      if (path.endsWith("publication-preview")) return preview();
      if (path === "/skills/xp/me") return { total_xp: 123, skills: [{ secret: 999 }] };
      return state;
    },
    put: async (path, body) => {
      writes.push({ path, body: structuredClone(body) });
      if (put) return put(body, (next) => (state = next));
      state = settings(body.profile_visibility, body.expected_revision + 1);
      return { current: state, receipt: {}, replayed: false };
    },
    uuid: () => "10000000-0000-4000-8000-000000000001",
    changed: () => changes++,
  });
  return {
    ...controller,
    view,
    writes,
    reads,
    state: (value) => (state = value),
    owner: (value) => (owner = value),
    changes: () => changes,
  };
}

test("unknown choice never implies sharing; the bilingual displayed notice matches its receipt hash", async () => {
  assert.throws(() => publication.publicationSettings({}));
  assert.throws(() => publication.publicationSettings({ profile_visibility: "shared" }));
  assert.equal(
    createHash("sha256").update(publication.PUBLICATION_NOTICE).digest("hex"),
    publication.PUBLICATION_NOTICE_HASH
  );
  for (const [locale, expected] of [
    ["de", publication.PUBLICATION_NOTICE_DE],
    ["en-US", publication.PUBLICATION_NOTICE_EN],
  ]) {
    const text = JSON.parse(await readFile(new URL(`../locales/${locale}.json`, import.meta.url)));
    assert.equal(text.ProfilePublication.Notice, expected);
  }
});

test("loading/preview writes nothing, stores only total XP, and a direct share needs a preview", async () => {
  const f = fixture();
  await f.reload();
  await f.choose("shared");
  assert.equal(f.writes.length, 0);
  await f.preview();
  assert.deepEqual(f.view.preview.card, { display_name: "Preview name", total_xp: 123 });
  assert.equal(f.view.preview.profile.email, undefined);
  assert.equal(f.writes.length, 0);
  await f.choose("shared");
  assert.deepEqual(f.writes[0].body, {
    profile_visibility: "shared",
    expected_revision: 0,
    request_id: "10000000-0000-4000-8000-000000000001",
    scope_version: publication.PUBLICATION_SCOPE,
    notice_hash: publication.PUBLICATION_NOTICE_HASH,
    preview_token: "owner-bound-preview",
  });
  assert.equal(f.view.success, "Shared");
  assert.equal(f.changes(), 1);
});

test("withdrawal takes one write with no preview, including after verification is lost", async () => {
  const f = fixture();
  f.state(settings("shared", 4));
  await f.reload();
  await f.choose("private");
  assert.deepEqual(Object.keys(f.writes[0].body).sort(), [
    "expected_revision",
    "profile_visibility",
    "request_id",
  ]);
  assert.equal(f.view.success, "PrivateAgain");
});

test("a changed owner, scope, notice or revision cannot create a usable preview", async () => {
  for (const change of [
    (p) => (p.profile.user_id = "B"),
    (p) => (p.scope_version = "broader-scope"),
    (p) => (p.notice = "different notice"),
    (p) => (p.notice_hash = "different hash"),
    (p) => (p.publication = settings("private", 99)),
  ]) {
    const f = fixture({
      get: (path, state, preview) => {
        if (!path.endsWith("publication-preview")) return state;
        const p = preview();
        change(p);
        return p;
      },
    });
    await f.reload();
    await f.preview();
    await f.choose("shared");
    assert.equal(f.view.preview, null);
    assert.equal(f.view.error, "NewPreview");
    assert.equal(f.writes.length, 0);
  }
});

test("CAS conflict rereads a withdrawal; an old share receipt never reports current sharing", async () => {
  for (const replay of [false, true]) {
    const f = fixture({
      put: (_, apply) => {
        apply(settings("private", 2));
        if (!replay) throw { statusCode: 409 };
        return {
          current: settings("private", 2),
          receipt: { profile_visibility: "shared" },
          replayed: true,
        };
      },
    });
    await f.reload();
    await f.preview();
    await f.choose("shared");
    assert.equal(f.view.settings.profile_visibility, "private");
    assert.equal(f.view.uncertain, false);
    assert.equal(f.writes.length, 1);
    assert.equal(f.view.success, replay ? "PrivateAgain" : "");
  }
});

test("a lost committed answer is reconciled by a fresh read with no write retry", async () => {
  const f = fixture({
    put: (body, apply) => {
      apply(settings(body.profile_visibility, 1));
      throw new TypeError("connection lost");
    },
  });
  await f.reload();
  await f.preview();
  await f.choose("shared");
  assert.equal(f.writes.length, 1);
  assert.equal(f.view.settings.profile_visibility, "shared");
  assert.equal(f.view.success, "");
  assert.equal(f.view.uncertain, false);
  assert.equal(f.changes(), 1);
});

test("503 and 401 never show optimistic success; an explicit retry retains exact CAS/request ID", async () => {
  for (const statusCode of [401, 503]) {
    let refused = true;
    const f = fixture({
      put: (body, apply) => {
        if (refused) throw { statusCode };
        apply(settings(body.profile_visibility, 1));
        return { current: settings(body.profile_visibility, 1) };
      },
    });
    await f.reload();
    await f.preview();
    await f.choose("shared");
    assert.equal(f.view.success, "");
    assert.equal(f.view.settings.profile_visibility, "private");
    assert.equal(f.view.uncertain, true);
    refused = false;
    await f.retry();
    assert.deepEqual(f.writes[0], f.writes[1]);
    assert.equal(f.view.success, "Shared");
  }
});

test("an unavailable read after a lost answer still permits the exact user-triggered retry", async () => {
  let readFails = false;
  const f = fixture({
    get: (path, state, preview) => {
      if (readFails) throw { statusCode: 503 };
      if (path.endsWith("publication-preview")) return preview();
      if (path === "/skills/xp/me") return { total_xp: 123 };
      return state;
    },
    put: () => {
      readFails = true;
      throw { statusCode: 503 };
    },
  });
  await f.reload();
  await f.preview();
  await f.choose("shared");
  assert.equal(f.view.settings, null);
  await f.retry();
  assert.deepEqual(f.writes[0], f.writes[1]);
});

test("a confirmed write followed by an unavailable reread retains its exact recoverable request", async () => {
  let unavailable = false;
  const f = fixture({
    get: (path, state, preview) => {
      if (unavailable) throw { statusCode: 503 };
      if (path.endsWith("publication-preview")) return preview();
      if (path === "/skills/xp/me") return { total_xp: 123 };
      return state;
    },
    put: (body, apply) => {
      apply(settings(body.profile_visibility, 1));
      unavailable = true;
      return { current: settings(body.profile_visibility, 1) };
    },
  });
  await f.reload();
  await f.preview();
  await f.choose("shared");
  assert.equal(f.view.settings, null);
  assert.equal(f.view.success, "");
  await f.retry();
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes[0], f.writes[1]);
});

test("A → B → A and a tab invalidation discard late settings, preview and write results", async () => {
  for (const operation of ["settings", "preview", "write"]) {
    const deferred = later();
    let hold = false;
    const f = fixture({
      get: (path, state, preview) => {
        if (
          hold &&
          (operation === "settings" ||
            (operation === "preview" && path.endsWith("publication-preview")))
        )
          return deferred.promise;
        if (path.endsWith("publication-preview")) return preview();
        if (path === "/skills/xp/me") return { total_xp: 123 };
        return state;
      },
      put: () => deferred.promise,
    });
    await f.reload();
    await f.preview();
    hold = true;
    const request =
      operation === "settings"
        ? f.reload()
        : operation === "preview"
          ? f.preview()
          : f.choose("shared");
    f.owner("B:session-B:second");
    f.clear();
    f.owner("A:session-A:third");
    deferred.resolve(
      operation === "write" ? { current: settings("shared", 1) } : settings("shared", 1)
    );
    await request;
    assert.equal(f.view.settings, null);
    assert.equal(f.view.preview, null);
    assert.equal(f.view.success, "");
  }
});

const epoch = "20000000-0000-4000-8000-000000000001";
const page = (ids = ["A"], revision = 1) => ({
  total: 3,
  publication_epoch: epoch,
  epoch_revision: revision,
  scope_version: publication.PUBLICATION_SCOPE,
  leaderboard: ids.map((id) => ({
    user: { id, display_name: id, avatar_url: null, bio: "private", admin: true },
    score: 10,
    rank: 1,
  })),
});

function ranking(get) {
  const state = leaderboard.emptyLeaderboardPage();
  let owner = "A:session:first";
  const calls = [];
  return {
    state,
    calls,
    owner: (value) => (owner = value),
    ...leaderboard.createLeaderboardPager({
      state,
      owner: () => owner,
      get: (path) => {
        calls.push(path);
        return get(path, calls.length);
      },
      commit: () => {},
    }),
  };
}

test("legacy and publication leaderboards retain only the decided fields; partial authority fails closed", () => {
  const active = page();
  const legacy = { leaderboard: active.leaderboard, total: 3 };
  for (const value of [active, legacy]) {
    const normalized = leaderboard.normalizeLeaderboardPage(value);
    assert.deepEqual(normalized.leaderboard[0].user, {
      id: "A",
      display_name: "A",
      avatar_url: null,
    });
  }
  assert.throws(() => leaderboard.normalizeLeaderboardPage(legacy, true));
  assert.equal(
    leaderboard.normalizeLeaderboardPage({
      total: 3,
      leaderboard: [{ user: null, score: 99, rank: 1 }, ...legacy.leaderboard],
    }).leaderboard.length,
    1
  );
  assert.throws(() =>
    leaderboard.normalizeLeaderboardPage({
      ...active,
      leaderboard: [{ user: null, score: 99, rank: 1 }],
    })
  );
  assert.throws(() =>
    leaderboard.normalizeLeaderboardPage({ ...active, epoch_revision: undefined })
  );
});

test("pagination carries epoch, preserves ties and replaces page zero instead of duplicating it", async () => {
  const f = ranking((_, n) => page(n === 2 ? ["B"] : ["A"]));
  await f.load("/ranking", 0, 1);
  await f.load("/ranking", 1, 1);
  assert.ok(f.calls[1].includes(`publication_epoch=${epoch}`));
  assert.deepEqual(
    f.state.entries.map((p) => p.user.id),
    ["A", "B"]
  );
  assert.equal(f.state.entries[1].rank, 1);
  await f.load("/ranking", 0, 1);
  assert.equal(f.state.entries.length, 1);
});

test("a 409 or different epoch discards loaded pages and restarts at zero", async () => {
  for (const conflict of [true, false]) {
    const f = ranking((_, n) => {
      if (n === 2) {
        if (conflict) throw { statusCode: 409 };
        return {
          ...page(["wrong-page"], 2),
          publication_epoch: "20000000-0000-4000-8000-000000000002",
        };
      }
      return page(n === 1 ? ["A"] : ["new-page"], n === 1 ? 1 : 2);
    });
    await f.load("/ranking", 0, 1);
    await f.load("/ranking", 1, 1);
    assert.deepEqual(
      f.state.entries.map((p) => p.user.id),
      ["new-page"]
    );
    assert.ok(f.calls[2].includes("offset=0"));
  }
});

test("late old-owner pages, missing active metadata and 401/503 cannot retain cached people", async () => {
  for (const reason of ["owner", "missing", 401, 503]) {
    const deferred = later();
    const f = ranking((_, n) => {
      if (n === 1) return page();
      if (reason === "owner") return deferred.promise;
      if (reason === "missing") return { total: 3, leaderboard: page(["B"]).leaderboard };
      throw { statusCode: reason };
    });
    await f.load("/ranking", 0, 1);
    const next = f.load("/ranking", 1, 1);
    if (reason === "owner") {
      f.owner("B:session:second");
      f.clear();
      deferred.resolve(page(["B"]));
    }
    await next;
    assert.deepEqual(f.state.entries, []);
    assert.equal(f.state.offset, 0);
  }
});
