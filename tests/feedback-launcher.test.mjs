/**
 * The page's feedback button beside a lesson frame. The frame covers the whole window and with it
 * the button; while a frame is open the button steps back, and the frame's bar opens the same
 * dialog through the shared state of composables/feedbackLauncher.ts. The real FeedbackLauncher,
 * mounted on an element tree.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { component, host, settle, tag } from "./helpers/mounted-page.mjs";

async function launcher({ open = Vue.ref(false), covered = Vue.ref(0) } = {}) {
  const Launcher = await component(
    "components/FeedbackLauncher.vue",
    {
      useRuntimeConfig: () => ({ public: {} }),
      useUser: () => Vue.ref(null),
      useAccessToken: () => Vue.ref(null),
      useDialogStack: () => Vue.ref([]),
      useFeedbackOpen: () => open,
      useFeedbackCovered: () => covered,
    },
    {
      "@headlessui/vue": { DialogPanel: tag("section"), DialogTitle: tag("h2") },
      "vue-i18n": { useI18n: () => ({ locale: Vue.ref("de") }) },
      "../utils/feedback": {},
    }
  );
  const ui = host();
  const app = ui.renderer.createApp(() => Vue.h(Launcher));
  app.component("StackedDialog", tag("dialog"));
  app.component("LazyFeedbackScreenshot", tag("div"));
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  await settle();
  const button = () =>
    ui.all().find((node) => node.type === "button" && /\bfeedback-open\b/.test(node.props.class));
  const shown = () => button().style.display !== "none";
  const dialog = () => ui.all().find((node) => node.type === "dialog");
  return { app, ui, open, covered, button, shown, dialog };
}

test("the page's feedback button steps back while a lesson frame covers it", async () => {
  const l = await launcher();
  assert.equal(l.shown(), true);
  l.covered.value = 1;
  await settle();
  assert.equal(l.shown(), false);
  l.covered.value = 0;
  await settle();
  assert.equal(l.shown(), true);
  l.app.unmount();
});

test("the bar of a lesson frame opens the page's one dialog, and closing it leaves the button back", async () => {
  const l = await launcher({ covered: Vue.ref(1) });
  assert.equal(l.dialog(), undefined);
  // What the frame's button does.
  l.open.value = true;
  await settle();
  assert.ok(l.dialog(), "the dialog is there");
  assert.equal(l.dialog().props.open, true);
  assert.match(l.ui.text(l.dialog()), /Feedback zur Bootstrap Academy/);
  assert.equal(l.shown(), false);
  l.dialog().props.onClose();
  await settle();
  assert.equal(l.open.value, false);
  assert.equal(l.dialog().props.open, false);
  // The frame closes; the page's own button is back.
  l.covered.value = 0;
  await settle();
  assert.equal(l.shown(), true);
  l.app.unmount();
});

test("a dialog asked for before the launcher was mounted opens with it", async () => {
  const l = await launcher({ open: Vue.ref(true), covered: Vue.ref(1) });
  assert.ok(l.dialog(), "the dialog is there");
  assert.equal(l.dialog().props.open, true);
  l.app.unmount();
});
