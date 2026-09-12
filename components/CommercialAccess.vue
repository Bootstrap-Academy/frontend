<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createCommercialAccess, type CommercialProof } from "../composables/commercialAccess";
import type { OriginalReadContext } from "../composables/originalDocuments";
import { createCommercialFetch } from "../composables/commercialFetch";

const props = withDefaults(
  defineProps<{
    identity: string;
    personalProof: () => CommercialProof | null;
    personalReadContext?: () => OriginalReadContext | null;
    ordinaryReadContext?: () => OriginalReadContext | null;
    showRecords?: boolean;
  }>(),
  { showRecords: true }
);
const { t } = useI18n();
const key = ref(""),
  recovery = ref(""),
  caseRecovery = ref(""),
  acknowledged = ref(false),
  notice = ref("");
const client = shallowRef<ReturnType<typeof createCommercialAccess> | null>(null);
const executing = ref(false);
let alive = true;
const busy = computed(
  () => executing.value || ["loading", "working"].includes(client.value?.state.value ?? "")
);
const hasPersonalProof = computed(() => {
  props.identity;
  return !!props.personalProof();
});
function clearView() {
  client.value?.clear();
  key.value = recovery.value = caseRecovery.value = notice.value = "";
  acknowledged.value = false;
  executing.value = false;
}
watch(() => props.identity, clearView, { flush: "sync" });
onScopeDispose(() => {
  alive = false;
  client.value?.dispose();
});
onMounted(async () => {
  const fetch = createCommercialFetch($fetch);
  client.value = createCommercialAccess({
    fetch: (path, options) =>
      fetch(path, { ...options, baseURL: useRuntimeConfig().public.BASE_API_URL }),
    storage: sessionStorage,
    ambient: moderationAmbientIdentity,
    identity: () => props.identity,
    personalProof: props.personalProof,
    personalReadContext: props.personalReadContext,
    ordinaryReadContext: props.ordinaryReadContext,
  });
  await act(() => client.value!.restore());
});
async function act(action: () => Promise<void>, openingAction = false) {
  if (busy.value) return;
  executing.value = true;
  notice.value = "";
  const identity = props.identity;
  try {
    await action();
  } catch (error: any) {
    if (alive && identity === props.identity) {
      const kind = client.value?.error.value || error?.message;
      notice.value = openingAction
        ? t(
            `CaseOpen.Error.${["proof_required", "invalid_recovery", "pending_request"].includes(kind) ? kind : "request_failed"}`
          )
        : t(
            `ClaimAccess.Error.${["proof_required", "no_case", "invalid_recovery", "pending_request", "replacement_inactive"].includes(kind) ? kind : "request_failed"}`
          );
    }
  } finally {
    if (alive && identity === props.identity) executing.value = false;
  }
}
async function importKey() {
  const value = key.value,
    identity = props.identity;
  await act(() => client.value!.connectKey(value));
  if (identity === props.identity) key.value = "";
}
async function importRecovery() {
  const value = recovery.value,
    identity = props.identity;
  await act(() => client.value!.importRecovery(value));
  if (identity === props.identity) recovery.value = "";
}
async function prepare() {
  acknowledged.value = false;
  await act(() => client.value!.prepare());
}
async function importOpening() {
  const value = caseRecovery.value,
    identity = props.identity;
  await act(() => client.value!.importCaseOpening(value), true);
  if (identity === props.identity) caseRecovery.value = "";
}
function download(opening = false) {
  try {
    const text = opening ? client.value!.caseOpeningText() : client.value!.recoveryText();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = opening ? "bootstrap-case-opening.json" : "bootstrap-commercial-access.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    notice.value = t("ClaimAccess.Error.proof_required");
  }
}
</script>

<template>
  <section class="grid gap-4 rounded border p-4 text-body" aria-labelledby="claim-access-title">
    <h2 id="claim-access-title">{{ t("ClaimAccess.Title") }}</h2>
    <p>{{ t("ClaimAccess.Explanation") }}</p>
    <p v-if="notice" role="alert">{{ notice }}</p>
    <p v-else-if="client?.error.value === 'proof_required'" role="alert">
      {{ t("ClaimAccess.Error.proof_required") }}
    </p>
    <OriginalDocuments
      v-if="client"
      :identity="`${identity}:${client.generation.value}`"
      :capture="client.originalReadContext"
      :ordinary-available="!!ordinaryReadContext"
    />
    <form class="grid gap-2" @submit.prevent="importKey">
      <label for="commercial-current-key">{{ t("ClaimAccess.CurrentKey") }}</label>
      <input
        id="commercial-current-key"
        v-model="key"
        type="password"
        autocomplete="off"
        spellcheck="false"
        required
        minlength="43"
        maxlength="256"
      />
      <button type="submit" :disabled="!client || busy">{{ t("ClaimAccess.ImportKey") }}</button>
    </form>
    <button
      v-if="hasPersonalProof"
      type="button"
      :disabled="!client || busy"
      @click="act(() => client!.connectPersonal(), true)"
    >
      {{ t("ClaimAccess.UseProof") }}
    </button>
    <section v-if="client?.canOpenCase.value" class="grid gap-3" aria-labelledby="case-open-title">
      <h3 id="case-open-title">{{ t("CaseOpen.Title") }}</h3>
      <p>{{ t("CaseOpen.Explanation") }}</p>
      <button
        v-if="!client.caseOpening.value"
        type="button"
        :disabled="busy || client.openingProofUnavailable.value"
        @click="act(() => client!.openCase(), true)"
      >
        {{ t("CaseOpen.Open") }}
      </button>
    </section>
    <div v-if="client?.caseOpening.value" class="grid gap-2">
      <p role="status">{{ t(`CaseOpen.State.${client.caseOpening.value.state}`) }}</p>
    </div>
    <details v-if="hasPersonalProof || client?.caseOpening.value">
      <summary>{{ t("CaseOpen.Recovery") }}</summary>
      <div class="mt-3 grid gap-3">
        <p>{{ t("CaseOpen.Keep") }}</p>
        <template v-if="client?.caseOpening.value">
          <button type="button" :disabled="busy" @click="download(true)">
            {{ t("CaseOpen.Save") }}
          </button>
          <button
            type="button"
            :disabled="busy || !hasPersonalProof || client.openingProofUnavailable.value"
            @click="act(() => client!.openCase(true), true)"
          >
            {{ t("CaseOpen.Retry") }}
          </button>
        </template>
        <form class="grid gap-2" @submit.prevent="importOpening">
          <label for="commercial-case-opening-recovery">{{ t("CaseOpen.File") }}</label>
          <textarea
            id="commercial-case-opening-recovery"
            v-model="caseRecovery"
            autocomplete="off"
            spellcheck="false"
            rows="3"
            required
          />
          <button
            type="submit"
            :disabled="!client || busy || !hasPersonalProof || client.openingProofUnavailable.value"
          >
            {{ t("CaseOpen.Import") }}
          </button>
        </form>
      </div>
    </details>
    <details>
      <summary>{{ t("ClaimAccess.Restore") }}</summary>
      <form class="mt-3 grid gap-2" @submit.prevent="importRecovery">
        <label for="commercial-recovery">{{ t("ClaimAccess.RecoveryFile") }}</label>
        <textarea
          id="commercial-recovery"
          v-model="recovery"
          autocomplete="off"
          spellcheck="false"
          rows="3"
          required
        />
        <button type="submit" :disabled="!client || busy">{{ t("ClaimAccess.Restore") }}</button>
      </form>
    </details>
    <p v-if="busy" role="status">{{ t("ClaimAccess.Working") }}</p>
    <template v-if="client?.owner.value">
      <p>{{ t("ClaimAccess.RotationEffect") }}</p>
      <button
        v-if="!client.pending.value || ['active', 'inactive'].includes(client.pending.value.state)"
        type="button"
        :disabled="busy"
        @click="prepare"
      >
        {{ t("ClaimAccess.Prepare") }}
      </button>
      <div v-if="client.pending.value" class="grid gap-3">
        <p role="status">{{ t(`ClaimAccess.State.${client.pending.value.state}`) }}</p>
        <button type="button" :disabled="busy" @click="download()">
          {{ t("ClaimAccess.Save") }}
        </button>
        <template v-if="!['active', 'inactive'].includes(client.pending.value.state)">
          <p>{{ t("ClaimAccess.KeepRecovery") }}</p>
          <label class="flex gap-2"
            ><input v-model="acknowledged" type="checkbox" />{{ t("ClaimAccess.Saved") }}</label
          >
          <button
            type="button"
            :disabled="busy || !acknowledged"
            @click="act(() => client!.submit())"
          >
            {{
              t(
                client.pending.value.state === "prepared"
                  ? "ClaimAccess.Replace"
                  : "ClaimAccess.Retry"
              )
            }}
          </button>
        </template>
      </div>
      <CommercialStatus
        v-if="showRecords !== false"
        :identity="`${identity}:${client.generation.value}`"
        :read="client.snapshot"
        :original="client.statement"
      />
      <LearningAccess
        :key="client.generation.value"
        :identity="`${identity}:${client.generation.value}`"
        :owner="client.owner.value"
        :summary="client.learningSummary"
        :start="client.startLearning"
        :refresh="client.refreshLearning"
        :resource-rights="client.resourceRights"
        :premium-continue="client.continuePremium"
        :course-snapshot="client.snapshot"
        :course-rights="client.courseRights"
        :course-continue="client.continueCourse"
      />
      <button type="button" :disabled="busy" @click="clearView">
        {{ t("ClaimAccess.Close") }}
      </button>
    </template>
    <template v-if="!client?.owner.value">
      <p>{{ t("ClaimAccess.MissingProof") }}</p>
      <NuxtLink to="/moderation/access">{{ t("ClaimAccess.PersonalAccess") }}</NuxtLink>
    </template>
    <p>
      {{ t("ClaimAccess.ContactLimit") }}
      <a href="mailto:hallo@bootstrap.academy">hallo@bootstrap.academy</a>
    </p>
  </section>
</template>

<style scoped>
input:not([type="checkbox"]),
textarea {
  width: 100%;
  color: #111827;
  background: white;
  border: 1px solid #94a3b8;
  border-radius: 0.3rem;
  padding: 0.65rem;
}
button {
  border: 1px solid currentColor;
  border-radius: 0.3rem;
  padding: 0.65rem;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
summary:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>
