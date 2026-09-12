<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createLearningAccess, type LearningStartBody } from "../composables/learningAccess";
import type { PremiumContinuationBody } from "../composables/premiumContinuation";
import type { CourseContinuationBody } from "../composables/courseContinuation";
import { formatHearts } from "../composables/shop";
import { createCommercialFetch } from "../composables/commercialFetch";

const props = defineProps<{
  identity: string;
  owner: { case_id: string; subject: string };
  summary: () => Promise<any>;
  start: (body: LearningStartBody) => Promise<any>;
  refresh: (body: {
    case_id: string;
    expected_subject: string;
    command_id: string;
    key: string;
  }) => Promise<any>;
  resourceRights?: () => Promise<unknown>;
  premiumContinue?: (body: PremiumContinuationBody) => Promise<unknown>;
  courseSnapshot?: () => Promise<unknown>;
  courseRights?: (source: string) => Promise<unknown>;
  courseContinue?: (body: CourseContinuationBody) => Promise<unknown>;
}>();
const { t, locale } = useI18n();
const courseView = ref(0);
const client = shallowRef<ReturnType<typeof createLearningAccess> | null>(null);
const busy = ref(false),
  acknowledged = ref(false),
  notice = ref(""),
  recovery = ref("");
let alive = true;
const premiumActive = ref(false);
let premiumTimer: ReturnType<typeof setTimeout> | undefined;
function updatePremiumClock() {
  if (premiumTimer) clearTimeout(premiumTimer);
  premiumTimer = undefined;
  const premium = client.value?.resources.value?.premium,
    now = Date.now();
  premiumActive.value =
    premium?.active === true && Date.parse(premium.since) <= now && now < Date.parse(premium.until);
  if (premiumActive.value)
    premiumTimer = setTimeout(
      updatePremiumClock,
      Math.min(2147483647, Math.max(1, Date.parse(premium.until) - now))
    );
}
watch(() => client.value?.resources.value, updatePremiumClock, { flush: "sync" });
const inactive = computed(() => client.value?.error.value === "learning_inactive");
function reset() {
  client.value?.clear();
  busy.value = false;
  acknowledged.value = false;
  notice.value = recovery.value = "";
}
watch(() => props.identity, reset, { flush: "sync" });
onScopeDispose(() => {
  alive = false;
  if (premiumTimer) clearTimeout(premiumTimer);
  client.value?.dispose();
});
onMounted(() => {
  const fetch = createCommercialFetch($fetch);
  client.value = createLearningAccess({
    owner: () => props.owner,
    identity: () => props.identity,
    ambient: moderationAmbientIdentity,
    storage: sessionStorage,
    summary: props.summary,
    start: props.start,
    refresh: props.refresh,
    fetch: (path, options) =>
      fetch(path, { ...options, baseURL: useRuntimeConfig().public.BASE_API_URL }),
  });
  try {
    client.value.restore();
  } catch {
    notice.value = t("LearningAccess.Failed");
  }
});
async function act(action: () => Promise<void> | void) {
  if (busy.value) return;
  const identity = props.identity;
  busy.value = true;
  notice.value = "";
  try {
    await action();
  } catch (cause: any) {
    if (alive && identity === props.identity) {
      const status = cause?.response?.status ?? cause?.statusCode;
      notice.value = t(
        status === 409 || cause.message === "subject_changed"
          ? "LearningAccess.SubjectChanged"
          : ["proof_required", "receipt_unconfirmed"].includes(cause.message)
            ? "LearningAccess.ProofRequired"
            : "LearningAccess.Failed"
      );
    }
  } finally {
    if (alive && identity === props.identity) busy.value = false;
  }
}
function saveFile() {
  try {
    const url = URL.createObjectURL(
      new Blob([client.value!.recoveryText()], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bootstrap-learning-access.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    notice.value = t("LearningAccess.Failed");
  }
}
async function prepare(subject: string) {
  acknowledged.value = false;
  await act(() => client.value!.prepare(subject));
}
async function prepareStart() {
  acknowledged.value = false;
  await act(() => client.value!.prepareStart());
}
async function importRecovery() {
  acknowledged.value = false;
  await act(() => client.value!.importRecovery(recovery.value));
  recovery.value = "";
}
</script>

<template>
  <section
    class="border-slate-400 grid gap-3 rounded border p-4 text-body"
    aria-labelledby="learning-access-title"
  >
    <h3 id="learning-access-title">{{ t("LearningAccess.Title") }}</h3>
    <p>{{ t("LearningAccess.Scope") }}</p>
    <button type="button" :disabled="!client || busy" @click="act(() => client!.loadSubjects())">
      {{ t("LearningAccess.Find") }}
    </button>
    <div v-for="(subject, index) in client?.subjects.value ?? []" :key="subject" class="grid gap-2">
      <p>{{ t("AccessCopy.LearningArea", { n: index + 1 }) }}</p>
      <details>
        <summary>{{ t("AccessCopy.Reference") }}</summary>
        <p class="break-all">{{ subject }}</p>
      </details>
      <button
        v-if="
          !client?.pending.value || ['recorded', 'refused'].includes(client.pending.value.state)
        "
        type="button"
        :disabled="busy"
        @click="prepare(subject)"
      >
        {{ t("LearningAccess.Prepare") }}
      </button>
    </div>
    <template v-if="client?.summaryLoaded.value && !client.subjects.value.length">
      <p>{{ t("LearningAccess.NoElection") }}</p>
      <button
        v-if="!client.pending.value || ['recorded', 'refused'].includes(client.pending.value.state)"
        type="button"
        :disabled="busy"
        @click="prepareStart"
      >
        {{ t("LearningAccess.PrepareStart") }}
      </button>
    </template>
    <details>
      <summary>{{ t("LearningAccess.Restore") }}</summary>
      <form class="grid gap-2" @submit.prevent="importRecovery">
        <label for="learning-recovery">{{ t("LearningAccess.Recovery") }}</label>
        <textarea
          id="learning-recovery"
          v-model="recovery"
          autocomplete="off"
          spellcheck="false"
          required
        />
        <button type="submit" :disabled="!client || busy">{{ t("LearningAccess.Restore") }}</button>
      </form>
    </details>
    <template v-if="client?.pending.value">
      <template v-if="client.pending.value.version === 1">
        <p>
          {{
            client.subjects.value.includes(client.pending.value.body.expected_subject)
              ? t("AccessCopy.SelectedLearningArea", {
                  n: client.subjects.value.indexOf(client.pending.value.body.expected_subject) + 1,
                })
              : t("AccessCopy.SelectedAccess")
          }}
        </p>
        <details>
          <summary>{{ t("AccessCopy.Reference") }}</summary>
          <p class="break-all">{{ client.pending.value.body.expected_subject }}</p>
        </details>
      </template>
      <p v-if="client.pending.value.version === 2">{{ t("LearningAccess.StartChoice") }}</p>
      <p v-if="client.pending.value.state === 'refused'" role="status">
        {{
          t(
            client.pending.value.version === 2
              ? "LearningAccess.StartRefused"
              : "LearningAccess.RefreshRefused"
          )
        }}
      </p>
      <p>{{ t("LearningAccess.Keep") }}</p>
      <button type="button" :disabled="busy" @click="saveFile">
        {{ t("LearningAccess.Save") }}
      </button>
      <label
        ><input v-model="acknowledged" type="checkbox" /> {{ t("LearningAccess.Saved") }}</label
      >
      <button type="button" :disabled="busy || !acknowledged" @click="act(() => client!.submit())">
        {{
          t(
            client.pending.value.state === "prepared"
              ? client.pending.value.version === 2
                ? "LearningAccess.Create"
                : "LearningAccess.Issue"
              : "LearningAccess.Retry"
          )
        }}
      </button>
      <p v-if="!client.resources.value" role="status">{{ t("LearningAccess.Unconfirmed") }}</p>
    </template>
    <div v-if="client?.resources.value" class="grid gap-2">
      <p role="status">{{ t("LearningAccess.Available") }}</p>
      <p>{{ t("LearningAccess.Expires") }}: {{ client.pending.value?.receipt?.expires_at }}</p>
      <p>{{ t("LearningAccess.Coins") }}: {{ client.resources.value.coins }}</p>
      <p>{{ t("LearningAccess.Withheld") }}: {{ client.resources.value.withheld_coins }}</p>
      <p>
        {{ t("LearningAccess.Hearts") }}:
        {{ formatHearts(client.resources.value.hearts, locale) }} /
        {{ formatHearts(client.resources.value.hearts_max, locale) }}
      </p>
      <p>
        {{ t("LearningAccess.Premium") }}:
        {{ t(premiumActive ? "LearningAccess.Active" : "LearningAccess.Inactive") }}
      </p>
      <button type="button" :disabled="busy" @click="act(() => client!.verify())">
        {{ t("LearningAccess.Check") }}
      </button>
    </div>
    <PremiumContinuation
      v-if="courseSnapshot && resourceRights && premiumContinue"
      :identity="identity"
      :owner="owner"
      :snapshot="courseSnapshot"
      :summary="summary"
      :rights="resourceRights"
      :continue-premium="premiumContinue"
      :resources="client?.resources.value"
      :premium-active="premiumActive"
      :check-resources="client ? client.verify : undefined"
      @erased-subject="client?.observeErasedSubject($event)"
    />
    <CourseContinuation
      v-if="courseSnapshot && courseRights && courseContinue"
      :identity="identity"
      :owner="owner"
      :snapshot="courseSnapshot"
      :summary="summary"
      :rights="courseRights"
      :continue-course="courseContinue"
      :learning-subject="client?.resources.value?.subject"
      @refresh-courses="courseView++"
    />
    <RetainedCourses
      v-if="client?.resources.value"
      :key="`${client.generation.value}:${courseView}`"
      :identity="`${identity}:${client.generation.value}:${courseView}`"
      :request="client.courseRequest"
    />
    <p v-if="inactive" role="status">{{ t("LearningAccess.Expired") }}</p>
    <p v-if="notice" role="alert">{{ notice }}</p>
  </section>
</template>

<style scoped>
button,
textarea {
  border: 1px solid currentColor;
  border-radius: 0.3rem;
  padding: 0.65rem;
}
textarea {
  color: #111827;
  background: white;
  width: 100%;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>
