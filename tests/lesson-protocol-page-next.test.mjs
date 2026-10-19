/**
 * The page's "Weiter" beside a lesson frame leaves the lesson. It comes once the unit is
 * completed; until then a "Weiter" inside the frame (the next wave of a lesson of the engine) is
 * the only one on the page. The frame covers the page's feedback button, so the bar ends with one
 * for the same dialog. The real ProtocolActivity, mounted with stand-ins for the package, the
 * frame and the host.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { component, host, settle } from "./helpers/mounted-page.mjs";

class HTMLButtonElement {}

async function player({
  locale = "de",
  feedbackOpen = Vue.ref(false),
  feedbackCovered = Vue.ref(0),
} = {}) {
  const done = Vue.ref(false);
  const navigated = [];
  const displays = [];
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
    requests = [];
    constructor(_element, notify) {
      this.notify = notify;
      displays.push(this);
    }
    async request(requested) {
      this.requests.push(requested);
      if (!requested) this.mode = "page";
      this.notify(this.mode, false);
    }
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
      useFeedbackOpen: () => feedbackOpen,
      useFeedbackCovered: () => feedbackCovered,
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
  // What a change of the display mode reaches for, to keep the focus on a button of the player.
  ui.all().find((node) => node.type === "section").contains = () => false;
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
  const press = async (label) => {
    buttons()
      .find((button) => button.label === label)
      .node.props.onClick();
    await settle();
  };
  return { app, done, navigated, displays, labels, buttons, key, press };
}

test("before the unit is completed the page's bar shows Schließen, Vollbild and Feedback, and no Weiter", async () => {
  const p = await player();
  assert.deepEqual(p.labels(), ["Schließen", "Vollbild", "Feedback"]);
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
      locale === "de"
        ? ["Weiter", "Schließen", "Vollbild", "Feedback"]
        : ["Next", "Close", "Fullscreen", "Feedback"]
    );
    await p.press(next);
    assert.deepEqual(p.navigated, ["next"], locale);
    await p.key("ArrowRight");
    assert.deepEqual(p.navigated, ["next", "next"], locale);
    p.app.unmount();
  }
});

test("the frame covers the page's feedback button while it is open, and its bar opens the same dialog", async () => {
  // The two shared values of composables/feedbackLauncher.ts, which the page's button reads.
  const feedbackOpen = Vue.ref(false);
  const feedbackCovered = Vue.ref(0);
  for (const locale of ["de", "en-US"]) {
    const p = await player({ locale, feedbackOpen, feedbackCovered });
    assert.equal(feedbackCovered.value, 1, `${locale}: the page's button steps back`);
    const feedback = p.buttons().find(({ label }) => label === "Feedback").node;
    assert.equal(feedback.props["aria-haspopup"], "dialog", locale);
    await p.press("Feedback");
    assert.equal(feedbackOpen.value, true, `${locale}: the page's dialog opens`);
    // It leaves the lesson as it is, and leaves no fullscreen it was not in.
    assert.deepEqual(p.navigated, [], locale);
    assert.deepEqual(p.displays[0].requests, [], locale);
    feedbackOpen.value = false;
    p.app.unmount();
    assert.equal(feedbackCovered.value, 0, `${locale}: the page's button is back`);
  }
});

test("in browser fullscreen the bar's Feedback leaves fullscreen first, so that the dialog shows", async () => {
  const feedbackOpen = Vue.ref(false);
  const order = [];
  Vue.watch(feedbackOpen, (value) => value && order.push("open"), { flush: "sync" });
  const p = await player({ feedbackOpen });
  const display = p.displays[0];
  display.mode = "browser-fullscreen";
  display.notify("browser-fullscreen", false);
  await settle();
  assert.deepEqual(p.labels(), ["Schließen", "Vollbild verlassen", "Feedback"]);
  const request = display.request.bind(display);
  display.request = async (requested) => {
    order.push(`fullscreen ${requested}`);
    return request(requested);
  };
  await p.press("Feedback");
  assert.deepEqual(order, ["fullscreen false", "open"]);
  assert.deepEqual(p.labels(), ["Schließen", "Vollbild", "Feedback"]);
  p.app.unmount();
});
