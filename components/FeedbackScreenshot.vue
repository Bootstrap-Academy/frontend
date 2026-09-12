<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  applyImageEdit,
  imageDimensions,
  isPrivateFeedbackPath,
  rasterizeScreenshot,
  type ImageRegion,
} from "../utils/feedback";

const props = defineProps<{ disabled: boolean; resetKey: number }>();
const emit = defineEmits<{
  update: [value: { data_url: string } | null];
  capture: [active: boolean];
}>();
const { locale } = useI18n();
const de = computed(() => locale.value.startsWith("de"));
const text = (german: string, english: string) => (de.value ? german : english);
const canvas = ref<HTMLCanvasElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const hasImage = ref(false);
const attached = ref(false);
const attachedPreview = ref("");
const busy = ref(false);
const captureSupported = ref(false);
const message = ref("");
const tool = ref("redact");
const region = reactive<ImageRegion>({ x: 0, y: 0, width: 50, height: 50 });
const size = reactive({ width: 1, height: 1 });
let original: HTMLCanvasElement | null = null;
let generation = 0;
let stream: MediaStream | null = null;
let start: { x: number; y: number } | null = null;

function stopCapture() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
}
function reset() {
  generation++;
  stopCapture();
  original = null;
  hasImage.value = false;
  attached.value = false;
  attachedPreview.value = "";
  busy.value = false;
  message.value = "";
  if (input.value) input.value.value = "";
  emit("update", null);
  emit("capture", false);
}
watch(() => props.resetKey, reset);
onBeforeUnmount(() => {
  generation++;
  stopCapture();
});
onMounted(() => {
  // Only offer native capture where the selected source can prove it is this tab.
  const media = navigator.mediaDevices as any;
  captureSupported.value =
    typeof media?.getDisplayMedia === "function" &&
    typeof media?.setCaptureHandleConfig === "function";
});

async function load(source: CanvasImageSource, width: number, height: number, owner: number) {
  if (owner !== generation) return;
  const dimensions = imageDimensions(width, height);
  const next = document.createElement("canvas");
  next.width = dimensions.width;
  next.height = dimensions.height;
  next.getContext("2d")!.drawImage(source, 0, 0, next.width, next.height);
  original = next;
  hasImage.value = true;
  attached.value = false;
  emit("update", null);
  await nextTick();
  if (owner !== generation || !canvas.value) return;
  restore();
}
function restore() {
  if (!original || !canvas.value || props.disabled) return;
  canvas.value.width = original.width;
  canvas.value.height = original.height;
  canvas.value.getContext("2d")!.drawImage(original, 0, 0);
  size.width = original.width;
  size.height = original.height;
  Object.assign(region, {
    x: 0,
    y: 0,
    width: Math.min(100, size.width),
    height: Math.min(60, size.height),
  });
  changed();
}
function changed() {
  attached.value = false;
  attachedPreview.value = "";
  message.value = "";
  emit("update", null);
}
async function fileSelected(file?: File) {
  if (!file || props.disabled || busy.value) return;
  const owner = ++generation;
  busy.value = true;
  message.value = "";
  let image: ImageBitmap | null = null;
  try {
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 12 * 1024 * 1024)
      throw new Error("file");
    image = await createImageBitmap(file);
    if (
      image.width > 16384 ||
      image.height > 16384 ||
      image.width * image.height > 64 * 1024 * 1024
    )
      throw new Error("file");
    await load(image, image.width, image.height, owner);
  } catch {
    if (owner === generation)
      message.value = text(
        "Wähle bitte ein PNG- oder JPEG-Bild mit höchstens 12 MB.",
        "Choose a PNG or JPEG image up to 12 MB."
      );
  } finally {
    image?.close();
    if (owner === generation) busy.value = false;
    if (input.value) input.value.value = "";
  }
}
function paste(event: ClipboardEvent) {
  const file = [...(event.clipboardData?.files ?? [])].find((value) =>
    ["image/png", "image/jpeg"].includes(value.type)
  );
  if (file) {
    event.preventDefault();
    void fileSelected(file);
  }
}
async function capture() {
  if (props.disabled || busy.value) return;
  const owner = ++generation;
  const media = navigator.mediaDevices as any;
  const handle = crypto.randomUUID();
  const startedOnPrivateView = isPrivateFeedbackPath(location.pathname);
  let acquired: MediaStream | null = null;
  let playbackTimeout: ReturnType<typeof setTimeout> | undefined;
  busy.value = true;
  message.value = "";
  emit("capture", true);
  try {
    media.setCaptureHandleConfig({
      handle,
      exposeOrigin: false,
      permittedOrigins: [location.origin],
    });
    // Called in the original click task: browsers require transient activation.
    acquired = await media.getDisplayMedia({
      video: true,
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      monitorTypeSurfaces: "exclude",
      surfaceSwitching: "exclude",
    });
    const active = acquired!;
    if (owner !== generation) throw new Error("cancelled");
    stream = active;
    const track = active.getVideoTracks()[0] as any;
    if (
      owner !== generation ||
      track?.getSettings().displaySurface !== "browser" ||
      track?.getCaptureHandle?.()?.handle !== handle
    )
      throw new Error("source");
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = active;
    await Promise.race([
      video.play(),
      new Promise((_, reject) => {
        playbackTimeout = setTimeout(() => reject(new Error("capture_timeout")), 5000);
      }),
    ]);
    clearTimeout(playbackTimeout);
    await nextTick();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    if (owner !== generation) return;
    const frame = document.createElement("canvas");
    const dimensions = imageDimensions(video.videoWidth, video.videoHeight);
    frame.width = dimensions.width;
    frame.height = dimensions.height;
    if (!frame.width || !frame.height) throw new Error("frame");
    const context = frame.getContext("2d")!;
    context.drawImage(video, 0, 0, frame.width, frame.height);
    // This is the verified current tab. Mask known editable/private areas before preview.
    const sx = frame.width / innerWidth,
      sy = frame.height / innerHeight;
    context.fillStyle = "#000";
    document
      .querySelectorAll(
        "input, textarea, [contenteditable=true], .monaco-editor, iframe, [data-feedback-private]"
      )
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height)
          context.fillRect(
            Math.floor(rect.left * sx),
            Math.floor(rect.top * sy),
            Math.ceil(rect.width * sx),
            Math.ceil(rect.height * sy)
          );
      });
    // Account/financial views contain private text beyond editable fields.
    // Keep protection if navigation occurs while the browser picker is open.
    if (startedOnPrivateView || isPrivateFeedbackPath(location.pathname))
      context.fillRect(0, 0, frame.width, frame.height);
    await load(frame, frame.width, frame.height, owner);
    if (owner === generation)
      message.value = text(
        "Wir haben erkannte private Bereiche geschwärzt. Prüfe bitte, ob noch persönliche Angaben sichtbar sind.",
        "We’ve masked the private areas we detected. Please check whether any personal details are still visible."
      );
  } catch {
    if (owner === generation)
      message.value = text(
        "Die Aufnahme hat nicht geklappt. Wähle diesen Tab aus oder lade ein Bild hoch.",
        "The capture didn’t work. Select this tab or upload an image."
      );
  } finally {
    clearTimeout(playbackTimeout);
    acquired?.getTracks().forEach((track) => track.stop());
    if (stream === acquired) stream = null;
    if (owner === generation)
      try {
        media.setCaptureHandleConfig({ handle: "", permittedOrigins: [] });
      } catch {
        /* optional API */
      }
    if (owner === generation) {
      busy.value = false;
      emit("capture", false);
    }
  }
}
function coordinates(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(size.width - 1, Math.round(((event.clientX - rect.left) * size.width) / rect.width))
    ),
    y: Math.max(
      0,
      Math.min(
        size.height - 1,
        Math.round(((event.clientY - rect.top) * size.height) / rect.height)
      )
    ),
  };
}
function pointerDown(event: PointerEvent) {
  if (props.disabled || busy.value) return;
  start = coordinates(event);
  canvas.value?.setPointerCapture(event.pointerId);
}
function pointerMove(event: PointerEvent) {
  if (!start) return;
  const end = coordinates(event);
  if (tool.value === "arrow") {
    Object.assign(region, {
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
    });
    return;
  }
  Object.assign(region, {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(1, Math.abs(end.x - start.x)),
    height: Math.max(1, Math.abs(end.y - start.y)),
  });
}
function pointerUp(event: PointerEvent) {
  if (!start) return;
  pointerMove(event);
  start = null;
  apply();
}
function apply() {
  if (!canvas.value || props.disabled || busy.value) return;
  if (![region.x, region.y, region.width, region.height].every(Number.isFinite)) return;
  applyImageEdit(canvas.value, tool.value, region);
  size.width = canvas.value.width;
  size.height = canvas.value.height;
  changed();
}
function attach() {
  if (!canvas.value || props.disabled || busy.value) return;
  try {
    const data_url = rasterizeScreenshot(canvas.value);
    emit("update", { data_url });
    attachedPreview.value = data_url;
    attached.value = true;
    message.value = "";
  } catch {
    message.value = text(
      "Das fertige Bild ist zu groß. Bitte weiter zuschneiden (maximal 3 MB).",
      "The final image is too large. Crop it further (maximum 3 MB)."
    );
  }
}
</script>

<template>
  <section class="feedback-image space-y-3" @paste="paste" aria-labelledby="feedback-image-heading">
    <h3 id="feedback-image-heading" class="font-semibold">
      {{ text("Bild (optional)", "Image (optional)") }}
    </h3>
    <p class="text-sm">
      {{
        text(
          "Schneide persönliche Angaben aus oder schwärze sie. Das Bild bleibt bis zum Absenden auf deinem Gerät.",
          "Crop out or cover personal details. The image stays on your device until you submit."
        )
      }}
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="disabled || busy"
        class="feedback-secondary"
        @click="input?.click()"
      >
        {{ text("Bild auswählen", "Choose image") }}
      </button>
      <button
        v-if="captureSupported"
        type="button"
        :disabled="disabled || busy"
        class="feedback-secondary"
        @click="capture"
      >
        {{ text("Diesen Tab aufnehmen", "Capture this tab") }}
      </button>
      <input
        ref="input"
        type="file"
        accept="image/png,image/jpeg"
        class="sr-only"
        tabindex="-1"
        :disabled="disabled || busy"
        :aria-label="text('Bild auswählen', 'Choose image')"
        @change="fileSelected(($event.target as HTMLInputElement).files?.[0])"
      />
    </div>
    <div
      tabindex="0"
      class="border-accent/60 rounded border border-dashed p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {{
        text(
          "Oder füge hier ein Bild mit Strg+V / ⌘V ein.",
          "Or paste an image here with Ctrl+V / ⌘V."
        )
      }}
    </div>
    <p v-if="busy" role="status">{{ text("Bild wird vorbereitet …", "Preparing image …") }}</p>
    <div v-if="hasImage" class="space-y-3">
      <label class="block text-sm"
        >{{ text("Werkzeug", "Tool") }}
        <select v-model="tool" :disabled="disabled || busy" class="feedback-input mt-1">
          <option value="redact">{{ text("Schwärzen", "Redact") }}</option>
          <option value="mark">{{ text("Rahmen zeichnen", "Mark rectangle") }}</option>
          <option value="arrow">{{ text("Pfeil zeichnen", "Draw arrow") }}</option>
          <option value="crop">{{ text("Auf Bereich zuschneiden", "Crop to region") }}</option>
        </select>
      </label>
      <p class="text-sm">
        {{
          text(
            "Ziehe im Bild über den Bereich, den du bearbeiten möchtest. Klicke danach auf „Dieses Bild anhängen“.",
            "Drag over the area you want to edit. Then choose “Attach this image”."
          )
        }}
      </p>
      <div class="border-accent/50 bg-black/30 flex justify-center overflow-hidden rounded border">
        <canvas
          v-show="!attached"
          ref="canvas"
          class="max-h-80 max-w-full touch-none"
          :aria-label="text('Lokale Bildvorschau', 'Local image preview')"
          @pointerdown="pointerDown"
          @pointermove="pointerMove"
          @pointerup="pointerUp"
          @pointercancel="start = null"
        />
        <img
          v-if="attached"
          :src="attachedPreview"
          class="max-h-80 max-w-full"
          :alt="text('Bild für deine Meldung', 'Image for your report')"
        />
      </div>
      <details>
        <summary class="cursor-pointer text-sm underline">
          {{ text("Bereich per Tastatur bearbeiten", "Edit region using the keyboard") }}
        </summary>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label v-for="key in ['x', 'y', 'width', 'height'] as const" :key="key" class="text-sm">
            {{
              key === "width"
                ? tool === "arrow"
                  ? text("X-Richtung", "X direction")
                  : text("Breite", "Width")
                : key === "height"
                  ? tool === "arrow"
                    ? text("Y-Richtung", "Y direction")
                    : text("Höhe", "Height")
                  : key.toUpperCase()
            }}
            <input
              v-model.number="region[key]"
              class="feedback-input"
              type="number"
              :min="
                key === 'x' || key === 'y'
                  ? 0
                  : tool === 'arrow'
                    ? -(key === 'width' ? size.width : size.height)
                    : 1
              "
              :max="key === 'x' || key === 'width' ? size.width : size.height"
              :disabled="disabled || busy"
            />
          </label>
        </div>
        <button
          type="button"
          :disabled="disabled || busy"
          class="feedback-secondary mt-2"
          @click="apply"
        >
          {{ text("Werkzeug anwenden", "Apply tool") }}
        </button>
      </details>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          :disabled="disabled || busy || attached"
          class="feedback-primary"
          @click="attach"
        >
          {{
            attached
              ? text("Bild angehängt", "Image attached")
              : text("Dieses Bild anhängen", "Attach this image")
          }}
        </button>
        <button
          v-if="attached"
          type="button"
          :disabled="disabled || busy"
          class="feedback-secondary"
          @click="changed"
        >
          {{ text("Weiter bearbeiten", "Continue editing") }}
        </button>
        <button
          type="button"
          :disabled="disabled || busy"
          class="feedback-secondary"
          @click="restore"
        >
          {{ text("Bearbeitung zurücksetzen", "Reset edits") }}
        </button>
        <button
          type="button"
          :disabled="disabled || busy"
          class="feedback-secondary"
          @click="reset"
        >
          {{ text("Bild entfernen", "Remove image") }}
        </button>
      </div>
      <p role="status" class="text-sm">
        {{
          attached
            ? text(
                "Dieses Bild wird mit deiner Meldung veröffentlicht.",
                "This image will be published with your report."
              )
            : text(
                "Klicke auf „Dieses Bild anhängen“, wenn du es mitsenden möchtest.",
                "Choose “Attach this image” if you want to include it."
              )
        }}
      </p>
    </div>
    <p v-if="message" role="status" class="border-accent/50 rounded border p-2 text-sm">
      {{ message }}
    </p>
  </section>
</template>
