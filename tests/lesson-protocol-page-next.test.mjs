/**
 * The page's "Weiter" beside a lesson frame leaves the lesson. It comes once the unit is
 * completed; until then a "Weiter" inside the frame (the next wave of a lesson of the engine) is
 * the only one on the page. The real ProtocolActivity, mounted with stand-ins for the package,
 * the frame and the host.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { component, host, settle } from "./helpers/mounted-page.mjs";

class HTMLButtonElement {}

async function player({ locale = "de" } = {}) {
  const done = Vue.ref(false);
  const navigated = [];
  class LessonHost {
    phase = "loading";
    constructor(options) {
      this.options = options;
    }
    start() {
      this.phase = "running";
      this.options.status("running");
    }
    async navigate(direction) {
      navigated.push(direction);
      return true;
    }
    async prepareNavigation() {
      return true;
    }
    async visibility() {}
    context() {}
    surface() {}
    fail() {}
    dispose() {}
  }
  class LessonDisplay {
    available = true;
    mode = "page";
    request() {}
    async enter() {
      return true;
    }
    dispose() {}
  }
  const Player = await component(
    "components/learning/ProtocolActivity.vue",
    {
      useRuntimeConfig: () => ({
        public: { lessonProtocolV2: "true", lessonContentOrigin: "https://content.invalid" },
      }),
      useHead: () => {},
      useRouter: () => ({ push: async () => true }),
      useSession: () => Vue.ref({ id: "session" }),
      matchMedia: () => ({ matches: false }),
      HTMLButtonElement,
      window: {
        innerWidth: 390,
        innerHeight: 640,
        devicePixelRatio: 1,
        location: { origin: "https://app.invalid" },
        addEventListener() {},
        removeEventListener() {},
        confirm: () => true,
      },
      document: {
        hidden: false,
        body: {},
        activeElement: null,
        addEventListener() {},
        removeEventListener() {},
      },
    },
    {
      "~/lesson-protocol/surface": { calculateSurface: () => ({ revision: 0 }) },
      "~/lesson-protocol/display": { LessonDisplay, observeLessonSurface: () => () => {} },
      "~/lesson-protocol/browser": {
        verifyLessonPackage: async (descriptor) => ({
          descriptor,
          manifest: {
            stage: { orientation: "portrait", safeMargin: 16 },
            state: { schemaVersion: 1 },
            goals: [],
          },
          validateState: () => {},
        }),
        createLessonFrame: () => ({
          element: {},
          transport: {},
          load: Promise.resolve(),
          dispose() {},
        }),
      },
      "~/lesson-protocol/rooms": { createRoomProtocolBinding: () => ({ bind: () => ({}) }) },
      "~/lesson-protocol/host": { LessonHost },
    }
  );
  const protocol = {
    data: { protocolSnapshot: () => ({ room: { unit: { content: {}, skip_allowed: false } } }) },
    owner: () => "user:session",
    advance: async () => true,
    // Like the composable: a getter over the room the page holds.
    get completed() {
      return done.value;
    },
  };
  const ui = host();
  const app = ui.renderer.createApp(() =>
    Vue.h(Player, {
      module: { id: "lesson", api_version: 2, manifest_hash: "m", package_hash: "p" },
      protocol,
      activityId: "unit",
      userId: "user",
      content: {},
      state: {},
      locale,
      disabled: false,
    })
  );
  app.mount(ui.root);
  await settle();
  const bar = () => ui.all().find((node) => node.type === "nav");
  const buttons = () =>
    ui
      .all(bar())
      .filter((node) => node.type === "button")
      .map((node) => ({ node, label: ui.text(node).replace(/\s+/g, " ").trim() }));
  const labels = () => buttons().map(({ label }) => label);
  const key = async (name, target = buttons()[0].node) => {
    bar().props.onKeydown({
      key: name,
      target: Object.assign(Object.create(HTMLButtonElement.prototype), target),
      preventDefault() {},
    });
    await settle();
  };
  return { app, done, navigated, labels, buttons, key };
}

test("before the unit is completed the page's bar shows Schließen and Vollbild, and no Weiter", async () => {
  const p = await player();
  assert.deepEqual(p.labels(), ["Schließen", "Vollbild"]);
  // The arrow keys stand for the page's Weiter and do nothing while it is not there.
  await p.key("ArrowRight");
  await p.key("ArrowDown");
  assert.deepEqual(p.navigated, []);
  p.app.unmount();
});

test("once the room is completed Weiter appears in the bar and continues", async () => {
  for (const locale of ["de", "en-US"]) {
    const p = await player({ locale });
    const next = locale === "de" ? "Weiter" : "Next";
    assert.equal(p.labels().includes(next), false, locale);
    p.done.value = true;
    await settle();
    assert.deepEqual(
      p.labels(),
      locale === "de" ? ["Weiter", "Schließen", "Vollbild"] : ["Next", "Close", "Fullscreen"]
    );
    p.buttons()
      .find(({ label }) => label === next)
      .node.props.onClick();
    await settle();
    assert.deepEqual(p.navigated, ["next"], locale);
    await p.key("ArrowRight");
    assert.deepEqual(p.navigated, ["next", "next"], locale);
    p.app.unmount();
  }
});
