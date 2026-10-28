// "Dein Lernweg": how the answers of skills-ms are read, the changes a learner makes, saving
// them against the revision of the plan, and the two pages that show it. Every answer is a
// stand-in that follows the agreed contract.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";
import { compileScript, parse } from "@vue/compiler-sfc";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const temporary = await mkdtemp(join(tmpdir(), "academy-learning-plan-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function moduleAt(path, name) {
  const file = join(temporary, name);
  const compilerOptions = { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext };
  await writeFile(file, ts.transpileModule(await read(path), { compilerOptions }).outputText);
  return import(pathToFileURL(file));
}
const plan = await moduleAt("utils/learningPlan.ts", "learningPlan.mjs");
const journey = await moduleAt("utils/courseJourney.ts", "courseJourney.mjs");
const messages = {
  de: JSON.parse(await read("locales/de.json")),
  "en-US": JSON.parse(await read("locales/en-US.json")),
};

const WORKSHOP = "https://example.invalid/workshop";
// The answers as `VERTRAG.md` writes them.
const TRACK = {
  id: "cloud-engineer",
  title: "Cloud Engineer",
  description: "Vom ersten Server bis zur Prüfung.",
  provider: null,
  level: "einsteiger",
  stages: [
    {
      id: "fundamentals",
      title: "Fundamentals",
      kind: "fundamentals",
      repeat_after_months: null,
      items: [
        { type: "course", course: "cloud", title: "Cloud Technologien" },
        { type: "course", course: "linux", title: "Linux" },
      ],
    },
    {
      id: "practitioner",
      title: "Practitioner",
      kind: "practitioner",
      repeat_after_months: null,
      items: [
        {
          type: "external",
          id: "workshop-practitioner",
          title: "Workshop Practitioner",
          url: WORKSHOP,
        },
      ],
    },
    {
      id: "refresher",
      title: "Auffrischung",
      kind: "refresher",
      repeat_after_months: 18,
      items: [],
    },
  ],
};
const PLAN = {
  revision: 3,
  character: "einsteiger",
  preference: "breit",
  steps: [
    {
      type: "course",
      course: "docker",
      title: "Docker",
      track: null,
      stage: null,
      status: "in_progress",
      done_units: 4,
      total_units: 12,
    },
    {
      type: "external",
      id: "workshop-practitioner",
      title: "Workshop Practitioner",
      url: WORKSHOP,
      track: "cloud-engineer",
      stage: "practitioner",
      status: "done",
      self_confirmed: true,
    },
  ],
  next: { type: "course", course: "docker" },
};
const SUGGESTIONS = [
  {
    type: "course",
    course: "linux",
    title: "Linux",
    reason: "next_after",
    reason_course: "it-foundations",
  },
  { type: "course", course: "git", title: "Git und GitHub", reason: "new_area" },
  {
    type: "course",
    course: "cloud",
    title: "Cloud Technologien",
    reason: "in_track",
    reason_track: "cloud-engineer",
  },
];
const DOCKER_STATE = { type: "course", course: "docker" };
const WORKSHOP_STATE = {
  type: "external",
  track: "cloud-engineer",
  stage: "practitioner",
  id: "workshop-practitioner",
  done: true,
};

const refusal = (status, data = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { statusCode: status, status, data });
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => (resolve = yes));
  return { promise, resolve };
};

/**
 * A plan service as the contract describes it: revisions, 409 with the current plan, and the
 * same answer for a repeated `request_id`. `conflict` says where a 409 carries the plan.
 */
function service({ conflict = "contract" } = {}) {
  const titles = {
    docker: "Docker",
    cloud: "Cloud Technologien",
    linux: "Linux",
    git: "Git und GitHub",
    "workshop-practitioner": "Workshop Practitioner",
  };
  const progress = { docker: ["in_progress", 4, 12] };
  const s = {
    revision: 3,
    state: { character: "einsteiger", preference: "breit", steps: [DOCKER_STATE, WORKSHOP_STATE] },
    puts: [],
    loads: 0,
    receipts: new Map(),
    /** What the next requests meet: an error to throw, or "lost" for a saved change whose answer is lost. */
    fail: [],
  };
  s.answer = () => ({
    revision: s.revision,
    character: s.state.character,
    preference: s.state.preference,
    steps: s.state.steps.map((step) =>
      step.type === "course"
        ? {
            type: "course",
            course: step.course,
            title: titles[step.course],
            track: step.track ?? null,
            stage: step.stage ?? null,
            status: progress[step.course]?.[0] ?? "open",
            done_units: progress[step.course]?.[1] ?? null,
            total_units: progress[step.course]?.[2] ?? null,
          }
        : {
            type: "external",
            id: step.id,
            title: titles[step.id],
            url: WORKSHOP,
            track: step.track,
            stage: step.stage,
            status: step.done ? "done" : "open",
            self_confirmed: step.done,
          }
    ),
    next: null,
  });
  s.load = async () => {
    s.loads++;
    return s.answer();
  };
  s.save = async (body) => {
    s.puts.push(structuredClone(body));
    const planned = s.fail.shift();
    if (planned && planned !== "lost") throw planned;
    if (s.receipts.has(body.request_id)) return s.receipts.get(body.request_id);
    if (body.expected_revision !== s.revision) {
      const current = s.answer();
      throw refusal(
        409,
        conflict === "contract"
          ? { detail: "Error.LearningConflict", code: "plan_conflict", plan: current }
          : conflict === "top"
            ? current
            : conflict === "detail"
              ? { detail: current }
              : { detail: "Error.LearningConflict" }
      );
    }
    s.revision++;
    s.state = structuredClone(body.state);
    const answer = s.answer();
    s.receipts.set(body.request_id, answer);
    if (planned === "lost") throw new TypeError("fetch failed");
    return answer;
  };
  /** Another tab or device saves in between. */
  s.elsewhere = (change) => {
    s.state = change(structuredClone(s.state));
    s.revision++;
  };
  return s;
}

function editorFor(s, options = {}) {
  const views = [];
  const settled = [];
  let requests = 0;
  const editor = plan.createPlanEditor({
    load: s.load,
    save: s.save,
    read: (raw) => plan.readPlan(raw, "de"),
    changed: (view) => views.push(structuredClone(view)),
    settled: (saved) => settled.push(saved),
    id: () => `request-${++requests}`,
    ...options,
  });
  return { editor, views, settled, last: () => views.at(-1) };
}
const order = (view) => view.plan.steps.map((step) => plan.planStepKey(step));

test("a plan is read as the contract writes it, and nothing else passes for one", () => {
  const read = plan.readPlan(PLAN, "de");
  assert.equal(read.revision, 3);
  assert.equal(read.character, "einsteiger");
  assert.deepEqual(read.next, { type: "course", course: "docker" });
  assert.deepEqual(read.steps[0], PLAN.steps[0]);
  assert.deepEqual(read.steps[1], PLAN.steps[1]);
  // Without a saved plan.
  assert.deepEqual(
    plan.readPlan({ revision: 0, character: null, preference: null, steps: [], next: null }, "de"),
    { revision: 0, character: null, preference: null, steps: [], next: null }
  );
  // Odd values become the plain case; a link is only a web address.
  const odd = plan.readPlan(
    {
      revision: 1,
      character: "guru",
      preference: "quer",
      steps: [
        { type: "course", course: "git", title: { de: "Git", en: "Git (en)" }, status: "weird" },
        { type: "external", id: "x", title: "X", url: "javascript:alert(1)", status: "done" },
        { type: "video", id: "nope" },
        null,
      ],
    },
    "en"
  );
  assert.equal(odd.character, null);
  assert.equal(odd.preference, null);
  assert.equal(odd.steps.length, 2);
  assert.equal(odd.steps[0].title, "Git (en)");
  assert.equal(odd.steps[0].status, "open");
  // A course without countable lessons has no numbers (skills-ms answers `null`).
  assert.equal(odd.steps[0].done_units, null);
  assert.equal(odd.steps[0].total_units, null);
  assert.equal(odd.steps[1].url, null);
  // `next` is the first step that is not done, whatever the answer said.
  assert.deepEqual(odd.next, { type: "course", course: "git" });
  for (const raw of [
    null,
    [],
    { revision: "3", steps: [] },
    { revision: 1 },
    { revision: -1, steps: [] },
  ])
    assert.throws(() => plan.readPlan(raw, "de"), /Invalid plan/, JSON.stringify(raw));
});

test("a learning path keeps its stages, their kinds and what each item is", () => {
  const [track, ...rest] = plan.readTracks(
    [
      TRACK,
      { title: "no id" },
      {
        ...TRACK,
        id: "with-provider",
        provider: { name: "Beispielpartner", url: "https://example.invalid" },
      },
    ],
    "de"
  );
  assert.deepEqual(track, TRACK);
  assert.equal(rest.length, 1);
  assert.deepEqual(rest[0].provider, { name: "Beispielpartner", url: "https://example.invalid" });
  assert.deepEqual(plan.TRACK_STAGE_KINDS, [
    "fundamentals",
    "practitioner",
    "mastery",
    "refresher",
    "certification",
  ]);
  // The detail of a path for a learner with an account says how far each item is.
  const detail = plan.readTrack(
    {
      ...TRACK,
      stages: [
        {
          ...TRACK.stages[0],
          items: [{ ...TRACK.stages[0].items[0], status: "in_progress" }, TRACK.stages[0].items[1]],
        },
      ],
    },
    "de"
  );
  assert.equal(detail.stages[0].items[0].status, "in_progress");
  assert.equal("status" in detail.stages[0].items[1], false);
  assert.throws(() => plan.readTracks({}, "de"), /Invalid tracks/);
  assert.equal(plan.readTrack({ detail: "not found" }, "de"), null);
});

test("the request names each step once, a step from a path with its path and stage", () => {
  const draft = plan.planDraft(plan.readPlan(PLAN, "de"));
  assert.deepEqual(plan.planState(draft), {
    character: "einsteiger",
    preference: "breit",
    steps: [DOCKER_STATE, WORKSHOP_STATE],
  });
  const fromTrack = plan.trackSteps(plan.readTrack(TRACK, "de"), "fundamentals");
  // A course names its path and stage both or neither.
  assert.deepEqual(plan.planState({ ...draft, steps: [{ ...fromTrack[0], stage: null }] }).steps, [
    { type: "course", course: "cloud" },
  ]);
  assert.deepEqual(plan.planState({ ...draft, steps: fromTrack }).steps, [
    { type: "course", course: "cloud", track: "cloud-engineer", stage: "fundamentals" },
    { type: "course", course: "linux", track: "cloud-engineer", stage: "fundamentals" },
  ]);
});

test("moving, removing, adding and ticking off name the step, never its place", () => {
  const draft = plan.planDraft(plan.readPlan(PLAN, "de"));
  const keys = (d) => d.steps.map((step) => plan.planStepKey(step));
  const workshop = "external:cloud-engineer:practitioner:workshop-practitioner";
  const move = (key, by) => plan.movePlanStep(draft.steps, key, by)(draft);
  assert.deepEqual(keys(move("course:docker", 1)), [workshop, "course:docker"]);
  assert.deepEqual(keys(move(workshop, -1)), [workshop, "course:docker"]);
  // At either end, or for a step that is gone, nothing moves.
  assert.equal(move("course:docker", -1), draft);
  assert.equal(move(workshop, 1), draft);
  assert.equal(move("course:gone", 1), draft);
  // A move means "past the neighbour shown": made again where it already happened, it is nothing.
  const down = plan.movePlanStep(draft.steps, "course:docker", 1);
  const moved = down(draft);
  assert.equal(down(moved), moved);
  // On a plan that grew elsewhere the step still goes past that same neighbour.
  const grown = { ...draft, steps: [...draft.steps, plan.suggestionStep(SUGGESTIONS[1])] };
  assert.deepEqual(keys(down(grown)), [workshop, "course:docker", "course:git"]);
  assert.deepEqual(keys(plan.removePlanStep("course:docker")(draft)), [workshop]);
  // A course already planned keeps its place; a new one goes to the end, once.
  const git = plan.suggestionStep(SUGGESTIONS[1]);
  const added = plan.addPlanSteps([{ ...draft.steps[0], track: "x" }, git, git])(draft);
  assert.deepEqual(keys(added), ["course:docker", workshop, "course:git"]);
  assert.equal(plan.addPlanSteps([draft.steps[0]])(draft), draft);
  const open = plan.confirmPlanStep(workshop, false)(draft);
  assert.equal(open.steps[1].status, "open");
  assert.equal(open.steps[1].self_confirmed, false);
  assert.equal(plan.planState(open).steps[1].done, false);
  // A course is done by learning it, not by a tick.
  assert.deepEqual(plan.confirmPlanStep("course:docker", true)(draft).steps[0], draft.steps[0]);
  assert.equal(plan.choosePlanCharacter("profi")(draft).character, "profi");
  assert.equal(plan.choosePlanPreference("tief")(draft).preference, "tief");
});

test("a path goes onto the plan whole or one stage at a time", () => {
  const track = plan.readTrack(TRACK, "de");
  const steps = plan.readPlan(PLAN, "de").steps;
  assert.deepEqual(
    plan.trackSteps(track).map((step) => [plan.planStepKey(step), step.stage]),
    [
      ["course:cloud", "fundamentals"],
      ["course:linux", "fundamentals"],
      ["external:cloud-engineer:practitioner:workshop-practitioner", "practitioner"],
    ]
  );
  assert.deepEqual(plan.trackCoverage(track, steps), { planned: 1, total: 3 });
  assert.deepEqual(plan.trackCoverage(track, steps, "practitioner"), { planned: 1, total: 1 });
  assert.equal(plan.openTrackStage(track, steps).id, "fundamentals");
  const all = plan.addPlanSteps(plan.trackSteps(track))({ steps }).steps;
  assert.equal(plan.openTrackStage(track, all), null);
  assert.deepEqual(plan.planStepOrigin(all[2], [track]), {
    track: "Cloud Engineer",
    stage: "Fundamentals",
  });
  assert.equal(plan.planStepOrigin(all[0], [track]), null);
});

test("every suggestion says why, with the names that are known", () => {
  const titles = {
    course: (id) => ({ "it-foundations": "IT-Grundlagen" })[id],
    track: (id) => ({ "cloud-engineer": "Cloud Engineer" })[id],
  };
  const reason = (suggestion, known = titles) => plan.suggestionReason(suggestion, known);
  assert.deepEqual(reason(SUGGESTIONS[0]), {
    key: "LearningPlan.Reason.NextAfter",
    values: { course: "IT-Grundlagen" },
  });
  assert.deepEqual(reason(SUGGESTIONS[1]), { key: "LearningPlan.Reason.NewArea", values: {} });
  assert.equal(reason({ ...SUGGESTIONS[1], reason: "deepen" }).key, "LearningPlan.Reason.Deepen");
  assert.equal(
    reason({ ...SUGGESTIONS[1], reason: "level_fit" }).key,
    "LearningPlan.Reason.LevelFit"
  );
  assert.deepEqual(reason(SUGGESTIONS[2]), {
    key: "LearningPlan.Reason.InTrack",
    values: { track: "Cloud Engineer" },
  });
  const nothing = { course: () => undefined, track: () => undefined };
  assert.equal(reason(SUGGESTIONS[0], nothing).key, "LearningPlan.Reason.NextAfterKnown");
  assert.equal(reason(SUGGESTIONS[2], nothing).key, "LearningPlan.Reason.InSomeTrack");
  assert.equal(reason({ ...SUGGESTIONS[1], reason: "popular" }), null);
  for (const locale of ["de", "en-US"])
    for (const key of [
      "NextAfter",
      "NextAfterKnown",
      "NewArea",
      "InTrack",
      "InSomeTrack",
      "Deepen",
      "LevelFit",
    ])
      assert.equal(typeof messages[locale].LearningPlan.Reason[key], "string", `${locale} ${key}`);
});

test("a change shows at once and is saved against the revision it was made on", async () => {
  const s = service();
  const { editor, settled, last } = editorFor(s);
  await editor.load();
  assert.equal(last().status, "ready");
  const saved = editor.apply(plan.movePlanStep(last().plan.steps, "course:docker", 1));
  // Before any answer the plan already shows the new order.
  assert.deepEqual(order(last()), [
    "external:cloud-engineer:practitioner:workshop-practitioner",
    "course:docker",
  ]);
  assert.equal(last().saving, true);
  assert.equal(await saved, true);
  assert.deepEqual(s.puts, [
    {
      request_id: "request-1",
      expected_revision: 3,
      state: {
        character: "einsteiger",
        preference: "breit",
        steps: [WORKSHOP_STATE, DOCKER_STATE],
      },
    },
  ]);
  assert.equal(last().plan.revision, 4);
  assert.equal(last().saving, false);
  assert.equal(last().failed, false);
  assert.equal(settled.length, 1);
  assert.equal(s.loads, 1);
});

test("quick changes go one after another, each on the answer to the one before", async () => {
  const s = service();
  const { editor, last } = editorFor(s);
  await editor.load();
  const first = editor.apply(plan.choosePlanCharacter("profi"));
  const second = editor.apply(plan.removePlanStep("course:docker"));
  assert.equal(last().plan.character, "profi");
  assert.equal(last().plan.steps.length, 1);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(
    s.puts.map((body) => [body.request_id, body.expected_revision]),
    [
      ["request-1", 3],
      ["request-2", 4],
    ]
  );
  assert.deepEqual(s.state.steps, [WORKSHOP_STATE]);
  assert.equal(s.state.character, "profi");
});

test("a plan changed elsewhere is read again and the change made once more, without a word", async () => {
  // `contract` is the answer skills-ms gives (`plan` beside `detail` and `code`).
  for (const conflict of ["contract", "top", "detail", "none"]) {
    const s = service({ conflict });
    const { editor, views, last } = editorFor(s);
    await editor.load();
    s.elsewhere((state) => ({
      ...state,
      steps: [...state.steps, { type: "course", course: "git" }],
    }));
    assert.equal(await editor.apply(plan.removePlanStep("course:docker")), true, conflict);
    assert.deepEqual(
      s.puts.map((body) => [body.request_id, body.expected_revision]),
      [
        ["request-1", 3],
        ["request-2", 4],
      ],
      conflict
    );
    // The other device's step stays, and this change is made on top of it.
    assert.deepEqual(s.state.steps, [WORKSHOP_STATE, { type: "course", course: "git" }], conflict);
    assert.deepEqual(order(last()), [
      "external:cloud-engineer:practitioner:workshop-practitioner",
      "course:git",
    ]);
    assert.equal(s.loads, conflict === "none" ? 2 : 1, conflict);
    assert(
      views.every((view) => !view.failed && view.status !== "error"),
      conflict
    );
  }
});

test("a move made once more after a conflict does not move the step twice", async () => {
  const s = service();
  const { editor, last } = editorFor(s);
  await editor.load();
  const down = plan.movePlanStep(last().plan.steps, "course:docker", 1);
  // Another device made the same move first.
  s.elsewhere((state) => ({ ...state, steps: [state.steps[1], state.steps[0]] }));
  assert.equal(await editor.apply(down), true);
  assert.equal(s.puts.length, 1);
  assert.deepEqual(s.state.steps, [WORKSHOP_STATE, DOCKER_STATE]);
  assert.equal(last().plan.revision, 4);
  assert.equal(last().failed, false);
});

test("a request without an answer is sent again as it was, so it is saved once", async () => {
  for (const kind of ["lost before", "lost after"]) {
    const s = service();
    const { editor, last } = editorFor(s);
    await editor.load();
    s.fail.push(kind === "lost before" ? new TypeError("fetch failed") : "lost");
    assert.equal(await editor.apply(plan.choosePlanPreference("tief")), true, kind);
    assert.equal(s.puts.length, 2, kind);
    assert.deepEqual(s.puts[0], s.puts[1], kind);
    assert.equal(s.revision, 4, kind);
    assert.equal(last().plan.preference, "tief", kind);
    assert.equal(last().failed, false, kind);
  }
});

test("a refused change leaves the plan as the server has it and says so once", async () => {
  const s = service();
  const { editor, last } = editorFor(s);
  await editor.load();
  s.fail.push(refusal(422, { detail: "unknown course" }));
  const unknown = { ...plan.suggestionStep(SUGGESTIONS[1]), course: "gone" };
  assert.equal(await editor.apply(plan.addPlanSteps([unknown])), false);
  assert.equal(last().failed, true);
  assert.deepEqual(order(last()), [
    "course:docker",
    "external:cloud-engineer:practitioner:workshop-practitioner",
  ]);
  assert.equal(s.loads, 2);
  // The next change that goes through ends the note.
  assert.equal(await editor.apply(plan.choosePlanCharacter("profi")), true);
  assert.equal(last().failed, false);
});

test("a change that changes nothing asks nothing, and an endless conflict stops", async () => {
  const s = service();
  const { editor, last } = editorFor(s);
  await editor.load();
  assert.equal(await editor.apply(plan.movePlanStep(last().plan.steps, "course:docker", -1)), true);
  assert.equal(s.puts.length, 0);
  for (let n = 0; n < 4; n++) s.fail.push(refusal(409, { detail: "Error.LearningConflict" }));
  assert.equal(await editor.apply(plan.choosePlanCharacter("profi")), false);
  assert.equal(s.puts.length, 4);
  assert.equal(last().failed, true);
  assert.equal(last().plan.character, "einsteiger");
});

test("after signing out nothing of the plan stays, and late answers change nothing", async () => {
  const s = service();
  const pending = deferred();
  const { editor, last } = editorFor(s, { save: () => pending.promise });
  await editor.load();
  const saved = editor.apply(plan.choosePlanCharacter("profi"));
  editor.clear();
  assert.equal(await saved, false);
  pending.resolve({ ...PLAN, revision: 9, character: "profi" });
  await settle();
  assert.deepEqual(last(), { status: "idle", plan: null, saving: false, failed: false });
  // A plan that cannot be read shows its error; one more try only when the server was busy.
  const broken = { ...service(), load: async () => ({ nope: true }) };
  const second = editorFor(broken);
  await second.editor.load();
  assert.equal(second.last().status, "error");
  let calls = 0;
  const busy = editorFor({
    ...service(),
    load: async () => {
      if (++calls === 1) throw refusal(503);
      return PLAN;
    },
  });
  await busy.editor.load();
  assert.equal(busy.last().status, "ready");
  assert.equal(calls, 2);
});

/** The composable with a stand-in for the API that records each request. */
async function composable(answers = {}) {
  const calls = [];
  const respond = (method, path, body, headers) => {
    calls.push({ method, path, body, headers });
    const answer = answers[`${method} ${path}`];
    return typeof answer === "function" ? answer(body) : structuredClone(answer);
  };
  const exports = await evaluate("composables/learningPlan.ts", {
    GET: async (path, query, headers) => respond("GET", path, undefined, headers),
    PUT: async (path, body, headers) => respond("PUT", path, body, headers),
    require: (name) => {
      assert.equal(name, "~/utils/learningPlan");
      return plan;
    },
  });
  return { ...exports, calls };
}

test("the four addresses, each in the language of the page", async () => {
  const api = await composable({
    "GET /skills/tracks": [TRACK],
    "GET /skills/tracks/cloud%20engineer%2F1": TRACK,
    "GET /skills/tracks/missing": { detail: "Not found" },
    "GET /skills/plan": PLAN,
    "GET /skills/plan/suggestions": SUGGESTIONS,
    "PUT /skills/plan": (body) => ({ ...PLAN, revision: 4, character: body.state.character }),
  });
  assert.deepEqual(await api.getTracks("de"), [TRACK]);
  assert.equal((await api.getTrack("cloud engineer/1", "en")).id, "cloud-engineer");
  await assert.rejects(() => api.getTrack("missing", "de"), /Invalid track/);
  assert.equal((await api.getPlan("de")).revision, 3);
  assert.equal((await api.getPlanSuggestions("de")).length, 3);
  let view;
  const editor = api.useLearningPlan({ language: () => "en", changed: (next) => (view = next) });
  await editor.load();
  assert.equal(await editor.apply(plan.choosePlanCharacter("profi")), true);
  assert.equal(view.plan.revision, 4);
  const put = api.calls.at(-1);
  assert.equal(put.path, "/skills/plan");
  assert.match(
    put.body.request_id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
  assert.equal(put.body.expected_revision, 3);
  assert.equal(put.body.state.character, "profi");
  assert.deepEqual(
    api.calls.map((call) => [call.method, call.path, call.headers["Accept-Language"]]),
    [
      ["GET", "/skills/tracks", "de"],
      ["GET", "/skills/tracks/cloud%20engineer%2F1", "en"],
      ["GET", "/skills/tracks/missing", "de"],
      ["GET", "/skills/plan", "de"],
      ["GET", "/skills/plan/suggestions", "de"],
      ["GET", "/skills/plan", "en"],
      ["PUT", "/skills/plan", "en"],
    ]
  );
});

test("the language goes with the request; the session still sets the authorization", async () => {
  const source = await read("composables/fetch.js");
  assert.match(source, /export function GET\(url, query, headers\)/);
  assert.match(source, /export function PUT\(url, body = null, headers\)/);
  // The caller's headers come first, so none of them can replace the session's token.
  assert.match(
    source,
    /headers: \{\n\s+\.\.\.headers,\n\s+Authorization: `Bearer \$\{accessToken\}`,/
  );
});

test("continuing leads into a course the way its own page does", () => {
  const video = {
    id: "docker",
    has_explicit_curriculum: false,
    learning_path_id: null,
    sections: [
      { id: "s1", title: "Start", lectures: [{ id: "l1", completed: true }, { id: "l2" }] },
    ],
  };
  assert.deepEqual(journey.courseContinueLocation(video), {
    path: "/courses/docker/watch",
    query: { section: "s1", lecture: "l2" },
  });
  assert.deepEqual(journey.courseContinueLocation({ ...video, learning_path_id: "loops" }), {
    path: "/learn",
    query: { course: "docker", path: "loops" },
  });
  const explicit = { ...video, id: "it foundations", has_explicit_curriculum: true };
  assert.equal(
    journey.courseContinueLocation(explicit, {
      lessons: [{ id: "a", completed: true }, { id: "b/1" }],
    }),
    "/courses/it%20foundations/lessons/b%2F1"
  );
  assert.equal(journey.courseContinueLocation(explicit, null), "/courses/it%20foundations");
});

const i18nModule = (locale = "de") => {
  const { global } = createI18n({ legacy: false, locale, messages });
  return { useI18n: () => ({ t: global.t, locale: global.locale }) };
};
const icons = new Proxy({}, { get: () => tag("svg") });
const parts = async (locale) => {
  const modules = {
    "vue-i18n": i18nModule(locale),
    "@heroicons/vue/24/outline": icons,
    "~/utils/learningPlan": plan,
  };
  return {
    modules,
    LearningPathStepList: await component("components/learning-path/StepList.vue", {}, modules),
    LearningPathSuggestionCard: await component(
      "components/learning-path/SuggestionCard.vue",
      {},
      modules
    ),
    LearningPathTrackCard: await component("components/learning-path/TrackCard.vue", {}, modules),
    LearningPathStageSymbol: await component(
      "components/learning-path/StageSymbol.vue",
      {},
      modules
    ),
    LearningPathInvitation: await component("components/learning-path/Invitation.vue", {}, modules),
  };
};
function mount(t, ui, root, props, children) {
  const app = ui.renderer.createApp(root, props);
  for (const [name, value] of Object.entries(children))
    if (name.startsWith("LearningPath")) app.component(name, value);
  app.component("NuxtLink", (attributes, { slots }) =>
    Vue.h("a", { ...attributes, href: attributes.to }, slots.default?.())
  );
  app.mount(ui.root);
  t.after(() => app.unmount());
  return app;
}
const find = (ui, type, text) =>
  ui.all().find((node) => node.type === type && ui.text(node).includes(text));
const labelled = (ui, label) => ui.all().find((node) => node.props["aria-label"] === label);

test("each step says what it is, how far it is and where it comes from", async (t) => {
  const children = await parts("de");
  const track = plan.readTrack(TRACK, "de");
  const steps = [
    { ...plan.trackSteps(track, "fundamentals")[1], status: "done" },
    plan.readPlan(PLAN, "de").steps[0],
    plan.trackSteps(track, "fundamentals")[0],
    { ...plan.trackSteps(track, "practitioner")[0] },
  ];
  const events = [];
  const ui = host();
  mount(
    t,
    ui,
    children.LearningPathStepList,
    {
      steps,
      tracks: [track],
      onMove: (...args) => events.push(["move", ...args]),
      onRemove: (...args) => events.push(["remove", ...args]),
      onConfirm: (...args) => events.push(["confirm", ...args]),
    },
    children
  );
  await settle();
  const said = ui.text();
  for (const line of [
    "Kurs · fertig · aus „Cloud Engineer“, Fundamentals",
    "Kurs · 4 von 12 Lektionen",
    "Kurs · aus „Cloud Engineer“, Fundamentals",
    "Extern · aus „Cloud Engineer“, Practitioner",
    "Als Nächstes",
    "Abhaken",
  ])
    assert(said.includes(line), line);
  assert.equal(labelled(ui, "„Linux“ nach oben").props.disabled, true);
  assert.equal(labelled(ui, "„Workshop Practitioner“ nach unten").props.disabled, true);
  assert.equal(labelled(ui, "„Docker“ nach oben").props.disabled, false);
  labelled(ui, "„Docker“ nach oben").props.onClick();
  labelled(ui, "„Cloud Technologien“ nach unten").props.onClick();
  labelled(ui, "„Linux“ vom Weg nehmen").props.onClick();
  ui.all()
    .find((node) => node.type === "input" && node.props.type === "checkbox")
    .props.onChange({ target: { checked: true } });
  assert.deepEqual(events, [
    ["move", "course:docker", -1],
    ["move", "course:cloud", 1],
    ["remove", "course:linux"],
    ["confirm", "external:cloud-engineer:practitioner:workshop-practitioner", true],
  ]);
  // The external step opens elsewhere and says so to a screen reader.
  const link = ui.all().find((node) => node.type === "a" && node.props.href === WORKSHOP);
  assert.equal(link.props.target, "_blank");
  assert.equal(link.props.rel, "noopener noreferrer");
  assert(ui.text(link).includes("öffnet sich in einem neuen Tab"));
});

/** A page with its real script, template and children, against `answers` for each request. */
async function page(t, file, { token = "token-a", locale = "de", answers, route = {} } = {}) {
  const children = await parts(locale);
  const calls = [];
  const pushes = [];
  const respond = async (method, path, body, headers) => {
    calls.push({ method, path, language: headers?.["Accept-Language"] ?? null });
    const answer = answers[`${method} ${path}`];
    if (answer === undefined) throw refusal(404, { detail: "Not found" });
    return typeof answer === "function" ? answer(body) : structuredClone(answer);
  };
  const GET = (path, query, headers) => respond("GET", path, undefined, headers);
  const PUT = (path, body, headers) => respond("PUT", path, body, headers);
  const api = await evaluate("composables/learningPlan.ts", {
    GET,
    PUT,
    require: () => plan,
  });
  const modules = {
    ...children.modules,
    "~/composables/fetch": { GET },
    "~/composables/learningPlan": api,
    "~/utils/courseJourney": journey,
    "~/utils/siteHead": { pageTitle: (text) => text, shortDescription: (text) => text },
  };
  const Page = await component(
    file,
    {
      useRouter: () => ({ push: async (to) => pushes.push(to) }),
      useRoute: () => Vue.reactive({ params: {}, fullPath: "/path", ...route }),
      useUser: () => Vue.ref(token ? { id: "user-a" } : null),
      useSession: () => Vue.ref(token ? { id: "session-a" } : null),
      useAccessToken: () => Vue.ref(token),
      useHead: () => {},
      useSeoMeta: () => {},
    },
    modules
  );
  const ui = host();
  mount(t, ui, Page, {}, children);
  await settle();
  await settle();
  return { ui, calls, pushes };
}

test("the own learning journey: choices, steps, suggestions and paths on one page", async (t) => {
  const s = service();
  const answers = {
    "GET /skills/tracks": [TRACK],
    "GET /skills/plan": () => s.load(),
    "PUT /skills/plan": (body) => s.save(body),
    "GET /skills/plan/suggestions": SUGGESTIONS,
    "GET /skills/courses/it-foundations/summary": { id: "it-foundations", title: "IT-Grundlagen" },
    "GET /skills/courses/docker": {
      id: "docker",
      has_explicit_curriculum: false,
      learning_path_id: null,
      sections: [{ id: "s1", title: "Start", lectures: [{ id: "l1", completed: false }] }],
    },
  };
  const { ui, calls, pushes } = await page(t, "pages/path/index.vue", { answers });
  const said = ui.text();
  for (const line of [
    "Dein Lernweg",
    "1 von 2 Schritten fertig",
    "Weiter lernen",
    "Nächster Schritt nach IT-Grundlagen",
    "Neues Gebiet, die Grundlagen dafür hast du",
    "Passt zu deinem Lernpfad „Cloud Engineer“",
    "Ganzen Pfad übernehmen",
    "Nur Fundamentals übernehmen",
  ])
    assert(said.includes(line), line);
  // Each of these is said once on the page.
  for (const once of ["Einsteiger", "Dein Lernweg", "1 von 2 Schritten fertig"])
    assert.equal(said.split(once).length - 1, once === "Einsteiger" ? 2 : 1, once);
  const radio = (value) =>
    ui.all().find((node) => node.type === "input" && node.props.value === value);
  assert.equal(radio("einsteiger").props.checked, true);
  assert.equal(radio("tief").props.checked, false);

  // A suggestion onto the plan: it leaves the suggestions at once.
  find(ui, "article", "Git und GitHub")
    .children.find((node) => node.type === "button")
    .props.onClick();
  await settle();
  assert(!find(ui, "article", "Git und GitHub"));
  assert.deepEqual(s.state.steps.at(-1), { type: "course", course: "git" });

  // Another device saves in between; the next change still goes through, without a note.
  s.elsewhere((state) => ({ ...state, preference: "tief" }));
  radio("profi").props.onChange({ target: radio("profi") });
  await settle();
  assert.equal(s.state.character, "profi");
  assert.equal(s.state.preference, "tief");
  assert(!ui.text().includes("Das hat gerade nicht geklappt"));
  assert.equal(radio("tief").props.checked, true);

  // The whole path: what is not on the plan yet goes to its end.
  find(ui, "button", "Ganzen Pfad übernehmen").props.onClick();
  await settle();
  assert.deepEqual(s.state.steps.slice(-2), [
    { type: "course", course: "cloud", track: "cloud-engineer", stage: "fundamentals" },
    { type: "course", course: "linux", track: "cloud-engineer", stage: "fundamentals" },
  ]);
  assert(ui.text().includes("Liegt auf deinem Weg"));
  assert(ui.text().includes("1 von 5 Schritten fertig"));

  // Continue leads to the first unwatched video of the first unfinished course.
  find(ui, "button", "Weiter lernen").props.onClick();
  await settle();
  assert.deepEqual(pushes, [
    { path: "/courses/docker/watch", query: { section: "s1", lecture: "l1" } },
  ]);
  // Every request went to the agreed addresses, in the language of the page.
  assert(calls.every((call) => call.path.startsWith("/skills/")));
  assert(
    calls
      .filter((call) => /^\/skills\/(plan|tracks)/.test(call.path))
      .every((call) => call.language === "de")
  );
  assert.equal(calls.filter((call) => call.method === "PUT").length, 4);
});

test("without an account the page shows the learning paths and the way to an account", async (t) => {
  const { ui, calls } = await page(t, "pages/path/index.vue", {
    token: "",
    answers: { "GET /skills/tracks": [TRACK] },
  });
  const said = ui.text();
  assert(said.includes("Lernpfade"));
  assert(said.includes("Dein eigener Lernweg"));
  assert(said.includes("Cloud Engineer"));
  assert(!said.includes("Ganzen Pfad übernehmen"));
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/skills/tracks"]
  );
  const signup = ui
    .all()
    .find((node) => node.type === "a" && node.props.href?.path === "/auth/signup");
  assert.deepEqual(signup.props.href.query, { redirect: "/path" });
});

test("the page of a path: stages, how far the learner is, and each stage onto the plan", async (t) => {
  const s = service();
  const detail = {
    ...TRACK,
    stages: TRACK.stages.map((stage) => ({
      ...stage,
      items: stage.items.map((item) => ({
        ...item,
        status: item.type === "external" ? "done" : "open",
      })),
    })),
  };
  const answers = {
    "GET /skills/tracks/cloud-engineer": detail,
    "GET /skills/plan": () => s.load(),
    "PUT /skills/plan": (body) => s.save(body),
  };
  const route = { params: { track: "cloud-engineer" }, fullPath: "/path/cloud-engineer" };
  const { ui, calls } = await page(t, "pages/path/[track].vue", { answers, route });
  const said = ui.text();
  for (const line of [
    "Cloud Engineer",
    "Einsteiger",
    "Alle 18 Monate auffrischen",
    "Extern · selbst abgehakt",
    "Diese Stufe übernehmen",
    "Ganzen Pfad übernehmen",
  ])
    assert(said.includes(line), line);
  find(ui, "button", "Diese Stufe übernehmen").props.onClick();
  await settle();
  assert.deepEqual(s.state.steps.slice(-2), [
    { type: "course", course: "cloud", track: "cloud-engineer", stage: "fundamentals" },
    { type: "course", course: "linux", track: "cloud-engineer", stage: "fundamentals" },
  ]);
  assert(!ui.text().includes("Ganzen Pfad übernehmen"));
  // One way back to the journey: the link above the title.
  assert(!ui.text().includes("Zu deinem Lernweg"));
  assert.equal(ui.text().split("Dein Lernweg").length - 1, 1);
  // After the change the path is read again, so its items say how far the learner is.
  assert.equal(calls.filter((call) => call.path === "/skills/tracks/cloud-engineer").length, 2);

  const guest = await page(t, "pages/path/[track].vue", { token: "", answers, route });
  assert(guest.ui.text().includes("Mit einem Konto übernimmst du diesen Pfad"));
  assert(!guest.ui.text().includes("Diese Stufe übernehmen"));
  assert(!guest.calls.some((call) => call.path === "/skills/plan"));
  const login = guest.ui
    .all()
    .find((node) => node.type === "a" && node.props.href?.path === "/auth/login");
  assert.deepEqual(login.props.href.query, { redirect: "/path/cloud-engineer" });

  const missing = await page(t, "pages/path/[track].vue", {
    answers: { "GET /skills/plan": () => s.load() },
    route: { params: { track: "gone" }, fullPath: "/path/gone" },
  });
  assert(missing.ui.text().includes("Diesen Lernpfad gibt es nicht."));
});

test("on the page of a course it goes onto the journey with one tap", async (t) => {
  const s = service();
  const children = await parts("de");
  const api = await evaluate("composables/learningPlan.ts", {
    GET: async () => s.load(),
    PUT: async (path, body) => s.save(body),
    require: () => plan,
  });
  const AddCourse = await component(
    "components/learning-path/AddCourse.vue",
    {},
    {
      ...children.modules,
      "~/composables/learningPlan": { ...api, useLearningPathsAvailable: () => Vue.ref(true) },
    }
  );
  const box = async (course, title) => {
    const ui = host();
    mount(t, ui, AddCourse, { course, title }, children);
    await settle();
    return ui;
  };
  const linux = await box("linux", "Linux");
  find(linux, "button", "Auf meinen Weg").props.onClick();
  await settle();
  assert.deepEqual(s.state.steps.at(-1), { type: "course", course: "linux" });
  const planned = find(linux, "a", "Liegt auf deinem Weg");
  assert.equal(planned.props.href, "/path");
  assert(!find(linux, "button", "Auf meinen Weg"));
  // A course already on the plan leads to it straight away.
  const docker = await box("docker", "Docker");
  assert(find(docker, "a", "Liegt auf deinem Weg"));
  assert.equal(s.puts.length, 1);
  // Without a plan to read, the course page stays as it was.
  const silent = await component(
    "components/learning-path/AddCourse.vue",
    {},
    {
      ...children.modules,
      "~/composables/learningPlan": {
        ...(await evaluate("composables/learningPlan.ts", {
          GET: async () => {
            throw refusal(503);
          },
          require: () => plan,
        })),
        useLearningPathsAvailable: () => Vue.ref(true),
      },
    }
  );
  const ui = host();
  mount(t, ui, silent, { course: "linux", title: "Linux" }, children);
  await settle();
  assert.equal(ui.text().trim(), "");
  // The course page shows it to an account only, afresh for another account.
  assert.match(
    await read("pages/courses/[id]/index.vue"),
    /<LearningPathAddCourse\n\s+v-if="!guest"\n\s+:key="`\$\{user\?\.id\}:\$\{session\?\.id\}`"\n\s+:course="id"/
  );
});

test("both languages have every text, per du and without gendering", () => {
  const keys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, inner]) =>
      typeof inner === "string" ? [`${prefix}${key}`] : keys(inner, `${prefix}${key}.`)
    );
  const de = messages.de.LearningPlan;
  assert.deepEqual(keys(messages["en-US"].LearningPlan).sort(), keys(de).sort());
  const german = keys(de).map((key) => key.split(".").reduce((value, part) => value[part], de));
  for (const text of german) {
    assert.doesNotMatch(text, /\b(Sie|Ihr|Ihre|Ihnen)\b/, text);
    assert.doesNotMatch(text, /[*:_/]innen|Innen\b/, text);
  }
});

/** The composable against a stand-in for the service; `answer` is what `GET /skills/tracks` gives. */
async function offering(answer, more = {}) {
  const asked = [];
  const states = new Map();
  const api = await evaluate("composables/learningPlan.ts", {
    $fetch: async (path, options) => {
      asked.push([path, options]);
      if (answer instanceof Error) throw answer;
      return structuredClone(answer);
    },
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://api.example.invalid" } }),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, Vue.ref(init()));
      return states.get(key);
    },
    require: () => plan,
    ...more,
  });
  return { api, asked };
}

test("the ways to the journey show only where skills-ms offers learning paths, else its pages lead home", async (t) => {
  const children = await parts("de");
  for (const [name, answer, offered] of [
    ["a list", [TRACK], true],
    ["404", refusal(404, { detail: "Not Found" }), false],
    ["no answer", new TypeError("fetch failed"), false],
    ["not a list", { detail: "Not Found" }, false],
  ]) {
    const planCalls = [];
    const { api, asked } = await offering(answer, {
      GET: async (path) => (planCalls.push(path), structuredClone(PLAN)),
    });
    // Nothing shows before the answer, so nothing appears and vanishes again.
    const shown = api.useLearningPathsAvailable();
    assert.equal(shown.value, null, name);
    assert.equal(await api.learningPathsAvailable(), offered, name);
    await settle();
    assert.equal(shown.value, offered, name);
    assert.equal(api.useLearningPathsAvailable().value, offered, name);
    // Asked once for the session, without the account, however often the answer is needed.
    assert.deepEqual(
      asked,
      [["/skills/tracks", { baseURL: "https://api.example.invalid", retry: 0, timeout: 6000 }]],
      name
    );

    // The navigation with and without an account, and the footer.
    for (const token of ["token-a", ""]) {
      const layout = await evaluate("layouts/default.vue", {
        computed: Vue.computed,
        useAccessToken: () => Vue.ref(token),
        useLearningPathsAvailable: api.useLearningPathsAvailable,
      });
      const links = layout.setup().links.value;
      assert.equal(
        links.some((link) => link.pathname === "/path"),
        offered,
        `${name} ${token}`
      );
      // With an account the journey follows the character; a visitor keeps the courses second.
      assert.equal(
        links[1].pathname,
        token ? (offered ? "/path" : "/skill-tree") : "/courses",
        `${name} ${token}`
      );
    }
    const footer = await evaluate("components/Footer.vue", {
      require: (module) =>
        ({ vue: Vue, "vue-i18n": { useI18n: () => ({ t: (key) => key }) } })[module],
      defineComponent: (options) => options,
      useLearningPathsAvailable: api.useLearningPathsAvailable,
    });
    const shownLinks = footer.setup().shownWebLinks.value;
    assert.equal(
      shownLinks.some((link) => link.pathname === "/path"),
      offered,
      name
    );
    assert.equal(shownLinks.length, offered ? 5 : 4, name);

    // The line above the title of the character page: a link, or the plain line.
    const Link = await component(
      "components/learning-path/Link.vue",
      {},
      {
        "@heroicons/vue/24/outline": icons,
        "~/composables/learningPlan": api,
      }
    );
    const line = host();
    mount(
      t,
      line,
      { render: () => Vue.h(Link, null, { default: () => "Dein Lernweg" }) },
      {},
      children
    );
    await settle();
    const link = line.all().find((node) => node.type === "a");
    assert.equal(link?.props.href ?? null, offered ? "/path" : null, name);
    assert(find(line, offered ? "a" : "p", "Dein Lernweg"), name);

    // The box on the course page asks for the plan only where paths are offered.
    const AddCourse = await component(
      "components/learning-path/AddCourse.vue",
      {},
      {
        ...children.modules,
        "~/composables/learningPlan": api,
      }
    );
    const box = host();
    mount(t, box, AddCourse, { course: "linux", title: "Linux" }, children);
    await settle();
    assert.equal(!!find(box, "button", "Auf meinen Weg"), offered, name);
    assert.deepEqual(planCalls, offered ? ["/skills/plan"] : [], name);
    if (!offered) assert.equal(box.text().trim(), "", name);

    // `/path` and `/path/<track>` lead home without a word: an account to its dashboard,
    // a visitor to the start page.
    for (const token of ["token-a", ""]) {
      const middleware = await evaluate("middleware/learning-paths.ts", {
        defineNuxtRouteMiddleware: (handler) => handler,
        navigateTo: (to, options) => ({ to, options }),
        useAppCookie: () => ({ value: token }),
        require: () => api,
      });
      assert.deepEqual(
        await middleware.default(),
        offered ? undefined : { to: token ? "/dashboard" : "/", options: { replace: true } },
        `${name} ${token}`
      );
    }
  }
  for (const file of ["pages/path/index.vue", "pages/path/[track].vue"])
    assert.match(
      await read(file),
      /definePageMeta\(\{ middleware: \["learning-paths"\] \}\);/,
      file
    );
  assert.match(
    await read("pages/dashboard/index.vue"),
    /<LearningPathLink class="eyebrow eyebrow-link">\{\{\s*t\("CharacterDashboard\.Eyebrow"\)\s*\}\}<\/LearningPathLink>/
  );
  for (const locale of ["de", "en-US"]) {
    assert.equal(typeof messages[locale].LearningPlan.Nav, "string");
    assert.equal(typeof messages[locale].LearningPlan.NavGuest, "string");
  }
});

test("when the next step lies outside without an address, the page says so where the button is", async (t) => {
  const external = { ...PLAN.steps[1], url: null, status: "open", self_confirmed: false };
  const raw = { ...PLAN, steps: [external, PLAN.steps[0]] };
  // `next` names an external step with its path and stage, as the contract does.
  assert.deepEqual(plan.readPlan(raw, "de").next, {
    type: "external",
    id: "workshop-practitioner",
    track: "cloud-engineer",
    stage: "practitioner",
  });
  const { ui } = await page(t, "pages/path/index.vue", {
    answers: {
      "GET /skills/tracks": [TRACK],
      "GET /skills/plan": raw,
      "GET /skills/plan/suggestions": [],
    },
  });
  assert(
    ui
      .text()
      .includes(
        "Als Nächstes: Workshop Practitioner. Das machst du außerhalb der Academy und hakst es unten ab."
      )
  );
  assert(!find(ui, "button", "Weiter lernen"));
  assert(!ui.all().some((node) => node.type === "progress" && node.props["aria-label"]));
});

for (const file of [
  "pages/path/index.vue",
  "pages/path/[track].vue",
  "components/learning-path/StepList.vue",
  "components/learning-path/SuggestionCard.vue",
  "components/learning-path/TrackCard.vue",
  "components/learning-path/StageSymbol.vue",
  "components/learning-path/Invitation.vue",
  "components/learning-path/AddCourse.vue",
  "components/learning-path/Link.vue",
]) {
  test(`${file}: Vue compiles the script and template, and i18n comes from vue-i18n`, async () => {
    const parsed = parse(await read(file), { filename: file });
    assert.deepEqual(parsed.errors, []);
    const compiled = compileScript(parsed.descriptor, { id: file, inlineTemplate: true });
    if (!file.endsWith("StageSymbol.vue") && !file.endsWith("Link.vue"))
      assert.equal(compiled.imports.useI18n?.source, "vue-i18n");
  });
}
