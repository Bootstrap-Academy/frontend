import { LessonSDK } from "../../sdk";
import { createLessonWindowTransport } from "../../browser";
import { appendLessonText, setLessonText, parseLessonOutput } from "../../safe-output";
import type { JsonObject } from "../../types";
import { validateManifest } from "../../validation";

// This synthetic package is approved only for Test and this private acceptance host.
const transport = createLessonWindowTransport(window, [
  "https://test.bootstrap.academy",
  "http://localhost:58761",
]);
let sdk: LessonSDK;
const element = (id: string) => document.getElementById(id)!;
const note = element("note") as HTMLTextAreaElement;
const restore = element("restore") as HTMLButtonElement;
const save = element("save") as HTMLButtonElement;
const retry = element("retry") as HTMLButtonElement;
const complete = element("complete") as HTMLButtonElement;
let state: JsonObject = {};
let pending: { id: string; state: JsonObject } | undefined;
let de = true;
let dirty = false;
let disabled = true;
let saving: Promise<boolean> | undefined;
function draw() {
  note.value = typeof state.note === "string" ? state.note : "";
  element("file").dataset.restored = String(state.restored === true);
  setLessonText(
    element("file"),
    state.restored
      ? de
        ? "Deine Notiz ist gerettet."
        : "Your note is recovered."
      : de
        ? "Die Notiz liegt noch in der Sicherung."
        : "Your note is still in the backup."
  );
}
function message(text: string) {
  setLessonText(element("status"), text);
}
function persist(repeated = false): Promise<boolean> {
  if (saving) return saving;
  saving = performSave(repeated).finally(() => {
    saving = undefined;
  });
  return saving;
}
async function performSave(repeated: boolean): Promise<boolean> {
  if (!pending) pending = { id: crypto.randomUUID(), state: { ...state } };
  save.disabled = true;
  note.disabled = restore.disabled = true;
  try {
    const result = repeated
      ? await sdk.retry(pending.id)
      : await sdk.saveState(pending.state, { id: pending.id });
    pending = undefined;
    dirty = false;
    retry.hidden = true;
    message((de ? "Gespeichert · Stand " : "Saved · revision ") + result.revision);
    return true;
  } catch {
    retry.hidden = false;
    message(
      de
        ? "Die Bestätigung fehlt noch. Versuch es nochmal; deine Notiz bleibt hier."
        : "Confirmation is still missing. Retry; your note stays here."
    );
    return false;
  } finally {
    save.disabled = disabled;
    note.disabled = restore.disabled = disabled || !!pending;
  }
}
void transport.connection
  .then((connection) => {
    const manifest = validateManifest(connection.payload.manifest);
    if (manifest.id !== "example-restore") throw new Error("Wrong example package");
    sdk = new LessonSDK({
      manifest,
      manifestHash: connection.payload.manifestHash as string,
      transport,
      onError: () => message("Die Verbindung ist unterbrochen. / Connection interrupted."),
      onLifecycle: async (phase, reason) => {
        if (phase === "paused" && reason === "navigation" && (dirty || pending))
          return !(await persist(!!pending));
        return dirty || !!pending;
      },
    });
    return sdk.start();
  })
  .then((init) => {
    de = init.locale === "de";
    disabled = init.disabled;
    state = { ...init.state.value };
    const text = de
      ? {
          title: "Rette deine Notiz",
          label: "Deine Notiz",
          restore: "Aus Sicherung holen",
          save: "Speichern",
          retry: "Speichern nochmal versuchen",
          complete: "Fertig",
          error: "Verbindung unterbrechen",
        }
      : {
          title: "Recover your note",
          label: "Your note",
          restore: "Recover from backup",
          save: "Save",
          retry: "Retry saving",
          complete: "Done",
          error: "Interrupt connection",
        };
    for (const [id, value] of Object.entries(text)) setLessonText(element(id), value);
    draw();
    message(de ? "Dein bestätigter Stand ist geladen." : "Your confirmed work is loaded.");
    for (const button of [restore, save, retry, complete, element("error") as HTMLButtonElement])
      button.disabled = init.disabled;
    note.disabled = init.disabled;
    sdk.ready("restore");
  })
  .catch(() => message("Verbindung nicht bereit. / Connection unavailable."));
note.addEventListener("input", () => {
  state = { ...state, note: note.value };
  dirty = true;
  message(de ? "Noch nicht gespeichert." : "Not saved yet.");
});
restore.addEventListener("click", () => {
  state = { ...state, restored: true };
  dirty = true;
  draw();
  sdk.progress("restore-openable", 1);
});
save.addEventListener("click", () => {
  void persist();
});
retry.addEventListener("click", () => {
  void persist(true);
});
complete.addEventListener("click", () => {
  void (async () => {
    if ((dirty || pending) && !(await persist(!!pending))) return;
    return sdk.request("completion.request", {
      goalIds: ["restore-openable"],
      stateRevision: sdk.snapshot!.revision,
      receiptHandles: [],
    });
  })()
    .then(
      (result) =>
        result &&
        message(result.outcome === "introduced" ? (de ? "Erkundet · 0 XP" : "Explored · 0 XP") : "")
    )
    .catch(() =>
      message(de ? "Rette und speichere deine Notiz zuerst." : "Recover and save your note first.")
    );
});
element("error").addEventListener("click", () => sdk.error("synthetic_interruption", true));
// C5 fixture: split markup and action-looking JSON are inert text/data.
appendLessonText(element("sample"), "<scr");
appendLessonText(
  element("sample"),
  'ipt>window.injected=true</script><img src="https://example.invalid/leak" onerror="window.injected=true">'
);
const output = parseLessonOutput(
  '{"action":"save","code":"javascript:alert(1)","completed":true,"xp":9000}',
  { type: "object" }
);
appendLessonText(element("sample"), JSON.stringify(output));
appendLessonText(
  element("sample"),
  '<svg onload="window.injected=true"></svg> ![remote](https://example.invalid/image) [open](javascript:alert(1))'
);
window.addEventListener(
  "pagehide",
  () => {
    sdk?.dispose();
    transport.close();
  },
  { once: true }
);
