import { bindLessonPointers, bindLessonStage, bindSceneKeyboard } from "../../input";
import { stagePoint, type Surface } from "../../surface";
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
const parcel = element("parcel") as HTMLButtonElement;
function controls() {
  const active = !disabled && sdk.phase === "running";
  const locked = !active || !!pending || !!saving;
  note.disabled = restore.disabled = parcel.disabled = complete.disabled = locked;
  save.disabled = locked;
  retry.disabled = !active || !!saving;
  (element("error") as HTMLButtonElement).disabled = !active;
}
let position = { x: 54, y: 72 };
let drag: number | undefined;
let startPosition = position;
let startPointer = { x: 0, y: 0 };
const place = () => {
  parcel.style.left = `${position.x}px`;
  parcel.style.top = `${position.y}px`;
};
function recover() {
  state = { ...state, restored: true };
  dirty = true;
  draw();
  sdk.progress("restore-openable", 1);
}
function cancelDrag() {
  if (drag === undefined) return false;
  drag = undefined;
  position = startPosition;
  place();
  return true;
}
function coordinates(event: PointerEvent) {
  return stagePoint(
    sdk.context!.surface as Surface,
    { x: event.clientX, y: event.clientY },
    { left: 0, top: 0 }
  );
}
parcel.addEventListener("pointerdown", (event) => {
  if (disabled || pending || sdk.phase !== "running") return;
  drag = event.pointerId;
  startPosition = { ...position };
  startPointer = coordinates(event);
  parcel.setPointerCapture(event.pointerId);
});
parcel.addEventListener("pointermove", (event) => {
  if (event.pointerId !== drag) return;
  const current = coordinates(event);
  position = {
    x: Math.max(24, Math.min(264, startPosition.x + current.x - startPointer.x)),
    y: Math.max(24, Math.min(280, startPosition.y + current.y - startPointer.y)),
  };
  place();
});
parcel.addEventListener("pointerup", (event) => {
  if (event.pointerId !== drag) return;
  drag = undefined;
  if (position.x > 190 && position.y > 100) recover();
  else {
    position = startPosition;
    place();
  }
});
parcel.addEventListener("pointercancel", cancelDrag);
place();
function draw() {
  if (state.restored) position = { x: 232, y: 125 };
  else position = { x: 54, y: 72 };
  place();
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
    controls();
  });
  return saving;
}
async function performSave(repeated: boolean): Promise<boolean> {
  if (!pending) pending = { id: crypto.randomUUID(), state: { ...state } };
  save.disabled = true;
  note.disabled = restore.disabled = parcel.disabled = true;
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
    controls();
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
        if (phase !== "running") cancelDrag();
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
    bindLessonPointers(sdk, document.body);
    bindLessonStage(sdk, element("stage"));
    sdk.onDispose(
      bindSceneKeyboard(parcel, {
        move: (x, y) => {
          if (disabled || pending) return;
          position = {
            x: Math.max(24, Math.min(264, position.x + x * 24)),
            y: Math.max(24, Math.min(280, position.y + y * 24)),
          };
          place();
        },
        activate: () => {
          if (!disabled && !pending) recover();
        },
        cancel: cancelDrag,
      })
    );
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLInputElement)
      ) {
        if (cancelDrag()) {
          event.preventDefault();
          return;
        }
        void sdk
          .navigate("close")
          .catch(() => message(de ? "Deine Arbeit bleibt hier." : "Your work stays here."));
      }
    };
    document.addEventListener("keydown", escape);
    sdk.onDispose(() => document.removeEventListener("keydown", escape));
    sdk.on("host.lifecycle", (payload) => {
      controls();
      if (payload.phase === "running")
        void sdk.navigation({ forward: true, back: true }).catch(() => {});
    });
    sdk.on("host.context", (payload) => {
      disabled = !!payload.disabled;
      controls();
    });
    sdk.ready("restore");
  })
  .catch(() => message("Verbindung nicht bereit. / Connection unavailable."));
note.addEventListener("input", () => {
  state = { ...state, note: note.value };
  dirty = true;
  message(de ? "Noch nicht gespeichert." : "Not saved yet.");
});
restore.addEventListener("click", () => {
  recover();
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
