<script setup lang="ts">
import { DialogPanel, DialogTitle } from "@headlessui/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  browserSummary,
  feedbackPayload,
  FeedbackSendError,
  osSummary,
  sendFeedback,
  type FeedbackDiagnostics,
  type FeedbackPayload,
} from "../utils/feedback";

const { locale } = useI18n();
const de = computed(() => locale.value.startsWith("de"));
const text = (german: string, english: string) => (de.value ? german : english);
const config = useRuntimeConfig();
const user = useUser();
const accessToken = useAccessToken();
const stack = useDialogStack();
const opened = ref(false);
const dialogMounted = ref(false);
watch(opened, (value) => {
  if (value) dialogMounted.value = true;
});
const ready = ref(false);
const capturing = ref(false);
const kind = ref<"bug" | "feature">("bug");
const title = ref("");
const description = ref("");
const expected = ref("");
const steps = ref("");
const consent = ref(false);
const diagnostics = ref<FeedbackDiagnostics | null>(null);
const screenshot = ref<{ data_url: string } | null>(null);
const resetKey = ref(0);
const sending = ref(false);
const pending = ref<FeedbackPayload | null>(null);
const uncertain = ref(false);
const error = ref("");
const issueUrl = ref("");
const titleField = ref<HTMLInputElement | null>(null);
const resultHeading = ref<HTMLElement | null>(null);
let owner = 0;
const locked = computed(() => sending.value || pending.value !== null);
const fullDescription = computed(() => {
  const parts = [description.value.trim()];
  if (kind.value === "bug") {
    if (expected.value.trim())
      parts.push(text("Erwartetes Verhalten", "Expected behavior") + ":\n" + expected.value.trim());
    if (steps.value.trim())
      parts.push(
        text("Schritte zum Nachstellen", "Steps to reproduce") + ":\n" + steps.value.trim()
      );
  }
  return parts.join("\n\n");
});
const valid = computed(
  () =>
    title.value.trim().length > 0 &&
    title.value.length <= 256 &&
    fullDescription.value.length > 0 &&
    fullDescription.value.length <= 4096
);

function readDiagnostics() {
  // This function is called only by the checkbox or the explicit preview-refresh button.
  if (!consent.value) return;
  const agent = navigator.userAgent;
  diagnostics.value = {
    app_build: String(config.public.FEEDBACK_BUILD || "unavailable").slice(0, 128),
    browser: browserSummary(agent),
    os: osSummary(agent),
    viewport: String(innerWidth) + "×" + String(innerHeight),
    language: locale.value.slice(0, 32),
    theme: "dark",
    reduced_motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
watch(
  consent,
  (value) => {
    if (value) readDiagnostics();
    else diagnostics.value = null;
  },
  { flush: "sync" }
);

function clearDraft() {
  owner++;
  title.value = "";
  description.value = "";
  expected.value = "";
  steps.value = "";
  consent.value = false;
  diagnostics.value = null;
  screenshot.value = null;
  pending.value = null;
  uncertain.value = false;
  issueUrl.value = "";
  error.value = "";
  sending.value = false;
  capturing.value = false;
  resetKey.value++;
}
async function anotherReport() {
  clearDraft();
  await nextTick();
  titleField.value?.focus();
}
watch(
  () => [Boolean(accessToken.value), user.value?.id ?? null],
  (next, previous) => {
    if (next[0] !== previous[0] || next[1] !== previous[1]) {
      clearDraft();
      opened.value = false;
    }
  }
);
onMounted(() => {
  ready.value = true;
});
onBeforeUnmount(() => {
  owner++;
});

async function submit() {
  if (sending.value || capturing.value || (!pending.value && !valid.value)) return;
  error.value = "";
  const operationOwner = owner;
  if (!pending.value) {
    pending.value = feedbackPayload(
      {
        request_id: crypto.randomUUID(),
        kind: kind.value,
        title: title.value,
        description: fullDescription.value,
      },
      consent.value,
      diagnostics.value,
      screenshot.value
    );
  }
  const payload = pending.value;
  sending.value = true;
  try {
    const result = await sendFeedback(String(config.public.BASE_API_URL), payload);
    if (owner !== operationOwner) return;
    if (result.status === "created") {
      issueUrl.value = result.issue_url;
      // Release local image and private draft contents after the confirmed result.
      title.value = description.value = expected.value = steps.value = "";
      consent.value = false;
      screenshot.value = null;
      resetKey.value++;
      pending.value = null;
      uncertain.value = false;
      await nextTick();
      resultHeading.value?.focus();
    } else {
      uncertain.value = true;
      error.value = "pending";
    }
  } catch (failure) {
    if (owner !== operationOwner) return;
    const problem =
      failure instanceof FeedbackSendError ? failure : new FeedbackSendError("uncertain", true);
    error.value = problem.code;
    if (problem.ambiguous) uncertain.value = true;
    // A later failure cannot erase uncertainty about an earlier accepted attempt.
    if (!uncertain.value) pending.value = null;
  } finally {
    if (owner === operationOwner) sending.value = false;
  }
}
const errorText = computed(() => {
  if (uncertain.value)
    return text(
      "Die Veröffentlichung ist noch nicht bestätigt. Dein Entwurf bleibt unverändert. „Status prüfen“ prüft denselben Vorgang und legt nicht blind eine neue Meldung an.",
      "Publication is not yet confirmed. Your draft stays unchanged. “Check status” checks the same request without blindly creating a new report."
    );
  if (error.value === "rate_limited")
    return text(
      "Zu viele Meldungen in kurzer Zeit. Bitte später erneut versuchen; dein Entwurf bleibt erhalten.",
      "Too many reports in a short time. Please try later; your draft is preserved."
    );
  if (error.value === "invalid_request")
    return text(
      "Die Meldung konnte nicht angenommen werden. Bitte Eingaben und Bildgröße prüfen.",
      "The report was not accepted. Please check the fields and image size."
    );
  return text(
    "Die Meldung konnte gerade nicht angenommen werden. Bitte später erneut versuchen. Dein Entwurf bleibt erhalten.",
    "The report could not be accepted right now. Please try again later. Your draft is preserved."
  );
});
</script>

<template>
  <div v-if="ready" class="feedback-launcher print:hidden">
    <button
      v-show="!opened && stack.length === 0"
      type="button"
      class="feedback-open fixed right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-accent bg-primary px-4 py-3 font-semibold text-heading shadow-lg"
      style="bottom: calc(1rem + env(safe-area-inset-bottom))"
      aria-haspopup="dialog"
      @click="opened = true"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path
          d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        />
        <path d="M7 9h10M7 13h7" />
      </svg>
      {{ text("Feedback", "Feedback") }}
    </button>
    <StackedDialog
      v-if="dialogMounted"
      :open="opened"
      :initial-focus="titleField"
      class="feedback-dialog fixed inset-0"
      :style="{
        display: opened ? undefined : 'none',
        visibility: capturing ? 'hidden' : undefined,
      }"
      @close="opened = false"
    >
      <div class="bg-black/40 fixed inset-0" aria-hidden="true" />
      <div class="fixed inset-0 flex items-end justify-end p-0 sm:p-4">
        <DialogPanel
          class="feedback-panel border-accent/50 flex max-h-[100dvh] w-full flex-col overflow-hidden border bg-primary text-heading shadow-xl sm:max-h-[min(90dvh,850px)] sm:max-w-[560px] sm:rounded-xl"
        >
          <div
            class="border-accent/30 flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3"
          >
            <DialogTitle class="text-lg font-semibold">{{
              text("Feedback zur Bootstrap Academy", "Bootstrap Academy feedback")
            }}</DialogTitle>
            <button
              type="button"
              class="feedback-secondary -mr-1 shrink-0"
              :aria-label="
                text('Feedback schließen; Entwurf behalten', 'Close feedback; keep draft')
              "
              @click="opened = false"
            >
              ✕
            </button>
          </div>
          <div
            class="min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <section v-if="issueUrl" class="space-y-4">
              <h3 ref="resultHeading" tabindex="-1" class="text-xl font-semibold">
                {{ text("Danke für deine Meldung.", "Thank you for your report.") }}
              </h3>
              <p>
                {{
                  text(
                    "Wir nutzen Hinweise zur Verbesserung der Plattform. Eine persönliche Antwort oder Umsetzung können wir nicht zusagen.",
                    "We use feedback to improve the platform. We cannot promise a personal reply or implementation."
                  )
                }}
              </p>
              <a
                :href="issueUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="feedback-primary inline-flex"
                >{{ text("Meldung auf GitHub ansehen", "View report on GitHub") }}</a
              >
              <p class="text-sm">
                {{
                  text(
                    "Für direkten Kontakt nutze die E-Mail-Adresse im",
                    "For direct contact, use the email address in our"
                  )
                }}
                <NuxtLink class="underline" to="/docs/imprint" @click="opened = false">{{
                  text("Impressum", "legal notice")
                }}</NuxtLink
                >.
              </p>
              <button type="button" class="feedback-secondary" @click="anotherReport">
                {{ text("Weitere Meldung schreiben", "Write another report") }}
              </button>
            </section>
            <form v-else class="space-y-5" @submit.prevent="submit">
              <p class="text-sm">
                {{
                  text(
                    "Fehler oder Idee? Kein Konto nötig. Sicherheitslücken und persönliche Konto- oder Löschanliegen bitte privat an die E-Mail-Adresse im",
                    "Bug or idea? No account needed. For security vulnerabilities and personal account or deletion requests, please use the private email contact in our"
                  )
                }}
                <NuxtLink to="/docs/imprint" class="underline" @click="opened = false">{{
                  text("Impressum", "legal notice")
                }}</NuxtLink
                >.
              </p>
              <fieldset :disabled="locked" class="space-y-4">
                <legend class="sr-only">{{ text("Deine Meldung", "Your report") }}</legend>
                <div class="flex flex-wrap gap-4">
                  <label class="flex min-h-11 cursor-pointer items-center gap-2"
                    ><input
                      v-model="kind"
                      type="radio"
                      value="bug"
                      name="feedback-kind"
                      class="h-5 w-5 accent-accent"
                    />{{ text("Fehler melden", "Report a bug") }}</label
                  >
                  <label class="flex min-h-11 cursor-pointer items-center gap-2"
                    ><input
                      v-model="kind"
                      type="radio"
                      value="feature"
                      name="feedback-kind"
                      class="h-5 w-5 accent-accent"
                    />{{ text("Idee vorschlagen", "Suggest an idea") }}</label
                  >
                </div>
                <label class="block"
                  >{{ text("Titel", "Title")
                  }}<input
                    ref="titleField"
                    v-model="title"
                    type="text"
                    required
                    maxlength="256"
                    autocomplete="off"
                    class="feedback-input mt-1"
                /></label>
                <label class="block"
                  >{{
                    kind === "bug"
                      ? text("Was ist passiert?", "What happened?")
                      : text("Deine Idee", "Your idea")
                  }}<textarea
                    v-model="description"
                    required
                    maxlength="4096"
                    rows="4"
                    class="feedback-input mt-1"
                  />
                </label>
                <template v-if="kind === 'bug'">
                  <label class="block text-sm"
                    >{{ text("Erwartetes Verhalten (optional)", "Expected behavior (optional)")
                    }}<textarea
                      v-model="expected"
                      maxlength="2048"
                      rows="2"
                      class="feedback-input mt-1"
                    />
                  </label>
                  <label class="block text-sm"
                    >{{
                      text("Schritte zum Nachstellen (optional)", "Steps to reproduce (optional)")
                    }}<textarea
                      v-model="steps"
                      maxlength="2048"
                      rows="2"
                      class="feedback-input mt-1"
                    />
                  </label>
                </template>
                <p class="text-sm" :class="{ 'text-red-300': fullDescription.length > 4096 }">
                  {{ fullDescription.length }} / 4096
                  {{ text("Zeichen insgesamt", "characters in total") }}
                </p>
                <div class="border-accent/40 space-y-3 rounded-lg border p-3">
                  <label class="flex cursor-pointer items-start gap-3"
                    ><input
                      v-model="consent"
                      type="checkbox"
                      class="mt-1 h-5 w-5 shrink-0 accent-accent"
                    /><span>{{
                      text(
                        "Technische Angaben mitsenden (optional)",
                        "Include technical details (optional)"
                      )
                    }}</span></label
                  >
                  <p class="text-sm">
                    {{
                      text(
                        "Ohne Auswahl senden wir keine zusätzlichen Browser-, System- oder Einstellungsangaben. Du kannst auch ohne Bild und technische Angaben melden.",
                        "Without this selection, we send no additional browser, system or settings details. You can report using text alone."
                      )
                    }}
                  </p>
                  <div v-if="consent && diagnostics" class="space-y-2">
                    <p class="text-sm font-semibold">
                      {{
                        text(
                          "Genau diese Angaben werden öffentlich mitgesendet:",
                          "Exactly these details will be published:"
                        )
                      }}
                    </p>
                    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-words text-sm">
                      <dt>{{ text("App-Build", "App build") }}</dt>
                      <dd>{{ diagnostics.app_build }}</dd>
                      <dt>Browser</dt>
                      <dd>{{ diagnostics.browser }}</dd>
                      <dt>{{ text("System", "System") }}</dt>
                      <dd>{{ diagnostics.os }}</dd>
                      <dt>{{ text("Fenster", "Viewport") }}</dt>
                      <dd>{{ diagnostics.viewport }}</dd>
                      <dt>{{ text("Sprache", "Language") }}</dt>
                      <dd>{{ diagnostics.language }}</dd>
                      <dt>Theme</dt>
                      <dd>{{ diagnostics.theme }}</dd>
                      <dt>{{ text("Weniger Bewegung", "Reduced motion") }}</dt>
                      <dd>
                        {{ diagnostics.reduced_motion ? text("Ja", "Yes") : text("Nein", "No") }}
                      </dd>
                    </dl>
                    <button type="button" class="feedback-secondary" @click="readDiagnostics">
                      {{ text("Vorschau aktualisieren", "Refresh preview") }}
                    </button>
                  </div>
                </div>
              </fieldset>
              <LazyFeedbackScreenshot
                :disabled="locked"
                :reset-key="resetKey"
                @update="screenshot = $event"
                @capture="capturing = $event"
              />
              <p class="border-accent/50 rounded-lg border bg-secondary p-3 text-sm">
                {{
                  text(
                    "Diese Meldung wird öffentlich auf GitHub veröffentlicht. Bitte keine persönlichen Daten oder Zugangsdaten eintragen. Eine persönliche Antwort oder Umsetzung können wir nicht zusagen.",
                    "This report will be published publicly on GitHub. Please do not include personal information or credentials. We cannot promise a personal reply or implementation."
                  )
                }}
                <NuxtLink
                  to="/docs/privacy#kommunikation"
                  class="underline"
                  @click="opened = false"
                >
                  {{ text("Datenschutzhinweise", "Privacy information") }}
                </NuxtLink>
              </p>
              <p v-if="error" role="alert" class="border-amber-400/60 rounded border p-3 text-sm">
                {{ errorText }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="submit"
                  class="feedback-primary"
                  :disabled="sending || capturing || (!pending && !valid)"
                >
                  {{
                    sending
                      ? text("Wird gesendet …", "Sending …")
                      : pending
                        ? text("Status prüfen", "Check status")
                        : text("Öffentlich melden", "Submit publicly")
                  }}
                </button>
                <button type="button" class="feedback-secondary" @click="opened = false">
                  {{ text("Schließen", "Close") }}
                </button>
              </div>
              <p class="text-xs">
                {{
                  text(
                    "Ein geschlossener Entwurf bleibt nur während dieses Seitenbesuchs erhalten. Beim Kontowechsel oder Neuladen wird er verworfen.",
                    "Closing keeps the draft only for this page visit. Switching accounts or reloading discards it."
                  )
                }}
              </p>
            </form>
          </div>
        </DialogPanel>
      </div>
    </StackedDialog>
  </div>
</template>

<style>
.feedback-primary,
.feedback-secondary {
  min-height: 44px;
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid #0cc9ab;
  overflow-wrap: anywhere;
}
.feedback-primary {
  background: #0cc9ab;
  color: #0b192e;
  font-weight: 700;
}
.feedback-secondary {
  background: #182b45;
  color: #cdd7f5;
}
.feedback-input {
  display: block;
  width: 100%;
  min-width: 0;
  border: 1px solid #66758a;
  border-radius: 0.4rem;
  background: #182b45;
  color: #cdd7f5;
  padding: 0.65rem;
}
.feedback-dialog button:focus-visible,
.feedback-dialog a:focus-visible,
.feedback-dialog input:focus-visible,
.feedback-dialog textarea:focus-visible,
.feedback-dialog select:focus-visible,
.feedback-dialog summary:focus-visible,
.feedback-open:focus-visible {
  outline: 3px solid #0cc9ab;
  outline-offset: 3px;
}
.feedback-dialog button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.feedback-dialog {
  overflow-wrap: anywhere;
}
.feedback-dialog fieldset:disabled .feedback-input {
  color: #cdd7f5;
}
</style>
