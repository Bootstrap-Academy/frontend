<script setup lang="ts">
import { onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  createPremiumContinuation,
  premiumPeriodState,
  type PremiumContinuationBody,
} from "../composables/premiumContinuation";
const props = defineProps<{
  identity: string;
  owner: { case_id: string; subject: string };
  snapshot: () => Promise<unknown>;
  summary: () => Promise<unknown>;
  rights: () => Promise<unknown>;
  continuePremium: (body: PremiumContinuationBody) => Promise<unknown>;
  resources?: {
    subject: string;
    premium: null | { period_id: string; since: string; until: string; active: boolean };
  } | null;
  premiumActive?: boolean;
  checkResources?: () => Promise<void>;
}>();
const emit = defineEmits<{ erasedSubject: [subject: string] }>();
const { t } = useI18n();
const client = shallowRef<ReturnType<typeof createPremiumContinuation> | null>(null),
  busy = ref(false),
  recovery = ref(""),
  notice = ref(""),
  now = ref(Date.now());
let alive = true,
  timer: ReturnType<typeof setTimeout> | undefined;
function clock() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  now.value = Date.now();
  const periods = [
    ...(client.value?.observations.value.map((o) => o.evidence) ?? []),
    ...(client.value?.pending.value ? [client.value.pending.value.observation.evidence] : []),
  ];
  const next = periods
    .flatMap((p) => [Date.parse(p.since), Date.parse(p.until)])
    .filter((n) => n > now.value);
  if (next.length)
    timer = setTimeout(clock, Math.min(2147483647, Math.max(1, Math.min(...next) - now.value)));
}
watch(
  () => [props.identity, props.owner.case_id, props.owner.subject],
  () => {
    client.value?.clear();
    busy.value = false;
    recovery.value = notice.value = "";
    clock();
  },
  { flush: "sync" }
);
watch(() => [client.value?.observations.value, client.value?.pending.value], clock);
onMounted(() => {
  client.value = createPremiumContinuation({
    owner: () => props.owner,
    identity: () => props.identity,
    ambient: moderationAmbientIdentity,
    storage: sessionStorage,
    snapshot: props.snapshot,
    summary: props.summary,
    rights: props.rights,
    continuePremium: props.continuePremium,
    onErasedSubject: (subject) => emit("erasedSubject", subject),
  });
  try {
    client.value.restore();
  } catch {
    notice.value = t("PremiumContinuation.Failed");
  }
});
onScopeDispose(() => {
  alive = false;
  client.value?.dispose();
  if (timer) clearTimeout(timer);
});
function view() {
  const identity = props.identity,
    owner = { ...props.owner };
  return () =>
    alive &&
    props.identity === identity &&
    props.owner.case_id === owner.case_id &&
    props.owner.subject === owner.subject;
}
async function act(action: () => void | Promise<void>) {
  if (busy.value) return;
  const valid = view();
  busy.value = true;
  notice.value = "";
  try {
    await action();
  } catch (cause: any) {
    if (valid())
      notice.value = t(
        cause.message === "pending_request"
          ? "PremiumContinuation.Pending"
          : cause.message === "existing_request"
            ? "PremiumContinuation.Existing"
            : ["right_changed", "target_changed", "period_unavailable"].includes(cause.message)
              ? "PremiumContinuation.Changed"
              : "PremiumContinuation.Failed"
      );
  } finally {
    if (valid()) {
      busy.value = false;
      clock();
    }
  }
}
function saveFile() {
  try {
    const url = URL.createObjectURL(
      new Blob([client.value!.recoveryText()], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bootstrap-premium-continuation.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    notice.value = t("PremiumContinuation.Failed");
  }
}
async function importRecovery() {
  const valid = view(),
    text = recovery.value;
  await act(() => client.value!.importRecovery(text));
  if (valid()) recovery.value = "";
}
function existing(evidence: string, target: string) {
  return client.value?.continuations.value.find(
    (r) => r.source_evidence === evidence && r.subject === target
  );
}
</script>
<template>
  <section
    class="grid gap-3 rounded border p-4 text-body"
    aria-labelledby="premium-continuation-title"
  >
    <h3 id="premium-continuation-title">{{ t("PremiumContinuation.Title") }}</h3>
    <p>{{ t("PremiumContinuation.Scope") }}</p>
    <button type="button" :disabled="!client || busy" @click="act(() => client!.load())">
      {{ t("PremiumContinuation.Load") }}
    </button>
    <template v-if="client?.loaded.value">
      <p v-if="!client.observations.value.length">{{ t("PremiumContinuation.Empty") }}</p>
      <p v-if="!client.targets.value.length">{{ t("PremiumContinuation.NoTarget") }}</p>
      <div
        v-for="observation in client.observations.value"
        :key="observation.id"
        class="grid gap-2 rounded border p-3"
      >
        <p class="break-all">
          {{ t("PremiumContinuation.Source") }}: {{ observation.evidence.subject }}
        </p>
        <p class="break-all">
          {{ t("PremiumContinuation.Period") }}: {{ observation.evidence.id }}
        </p>
        <p>
          {{ t("PremiumContinuation.OriginalDates") }}:
          <time :datetime="observation.evidence.since">{{ observation.evidence.since }}</time> –
          <time :datetime="observation.evidence.until">{{ observation.evidence.until }}</time>
        </p>
        <p>
          {{
            t(`PremiumContinuation.PeriodState.${premiumPeriodState(observation.evidence, now)}`)
          }}
        </p>
        <div v-for="target in client.targets.value" :key="target" class="grid gap-2">
          <p class="break-all">{{ t("PremiumContinuation.Target") }}: {{ target }}</p>
          <button
            v-if="existing(observation.id, target)"
            type="button"
            :disabled="
              busy ||
              (client.blocked.value &&
                client.pending.value?.body.command_id !==
                  existing(observation.id, target)!.command_id)
            "
            @click="act(() => client!.recoverContinuation(existing(observation.id, target)!.id))"
          >
            {{ t("PremiumContinuation.RecoverExisting") }}
          </button>
          <button
            v-else
            type="button"
            :disabled="
              busy ||
              client.blocked.value ||
              premiumPeriodState(observation.evidence, now) !== 'current'
            "
            @click="act(() => client!.prepare(observation.id, target))"
          >
            {{ t("PremiumContinuation.Review") }}
          </button>
        </div>
      </div>
    </template>
    <details v-if="client?.continuations.value.length">
      <summary>{{ t("PremiumContinuation.Recorded") }}</summary>
      <div v-for="row in client.continuations.value" :key="row.id" class="grid gap-2 py-3">
        <p class="break-all">{{ t("PremiumContinuation.Period") }}: {{ row.original.id }}</p>
        <p class="break-all">{{ t("PremiumContinuation.Target") }}: {{ row.subject }}</p>
        <p>{{ t(`PremiumContinuation.State.${row.state}`) }}</p>
        <button
          type="button"
          :disabled="
            busy ||
            (client.blocked.value && client.pending.value?.body.command_id !== row.command_id)
          "
          @click="act(() => client!.recoverContinuation(row.id))"
        >
          {{ t("PremiumContinuation.RecoverExisting") }}
        </button>
      </div>
    </details>
    <template v-if="client?.pending.value">
      <p class="break-all">
        {{ t("PremiumContinuation.Reference") }}: {{ client.pending.value.body.command_id }}
      </p>
      <p class="break-all">
        {{ t("PremiumContinuation.Period") }}: {{ client.pending.value.observation.evidence.id }}
      </p>
      <p>
        {{ t("PremiumContinuation.OriginalDates") }}:
        {{ client.pending.value.observation.evidence.since }} –
        {{ client.pending.value.observation.evidence.until }}
      </p>
      <p class="break-all">
        {{ t("PremiumContinuation.Target") }}: {{ client.pending.value.body.successor }}
      </p>
      <p>{{ t("PremiumContinuation.Choice") }}</p>
      <button type="button" :disabled="busy" @click="act(() => client!.submit())">
        {{
          t(
            client.pending.value.state === "prepared"
              ? "PremiumContinuation.Continue"
              : "PremiumContinuation.Retry"
          )
        }}
      </button>
      <p role="status">
        {{
          t(
            client.current.value && client.loaded.value
              ? `PremiumContinuation.State.${client.current.value.state}`
              : client.pending.value.state === "refused"
                ? "PremiumContinuation.Refused"
                : client.pending.value.state === "prepared"
                  ? "PremiumContinuation.Prepared"
                  : "PremiumContinuation.Unconfirmed"
          )
        }}
      </p>
      <p v-if="client.pending.value.last?.state === 'withdrawn'">
        {{ t("PremiumContinuation.WithdrawnHistory") }}
      </p>
      <p v-if="client.pending.value.receipt">{{ t("PremiumContinuation.Historical") }}</p>
    </template>
    <details>
      <summary>{{ t("PremiumContinuation.Restore") }}</summary>
      <div class="mt-3 grid gap-2">
        <p>{{ t("PremiumContinuation.Keep") }}</p>
        <button v-if="client?.pending.value" type="button" :disabled="busy" @click="saveFile">
          {{ t("PremiumContinuation.Save") }}
        </button>
        <form class="grid gap-2" @submit.prevent="importRecovery">
          <label for="premium-continuation-recovery">{{ t("PremiumContinuation.Recovery") }}</label>
          <textarea
            id="premium-continuation-recovery"
            v-model="recovery"
            required
            autocomplete="off"
            spellcheck="false"
          />
          <button type="submit" :disabled="!client || busy">
            {{ t("PremiumContinuation.Import") }}
          </button>
        </form>
      </div>
    </details>
    <div v-if="resources" class="grid gap-2">
      <p class="break-all">{{ t("PremiumContinuation.CurrentTarget") }}: {{ resources.subject }}</p>
      <p>
        {{
          t(
            premiumActive
              ? "PremiumContinuation.CurrentActive"
              : "PremiumContinuation.CurrentNotActive"
          )
        }}
      </p>
      <p v-if="resources.premium">
        {{ t("PremiumContinuation.CurrentDates") }}: {{ resources.premium.since }} –
        {{ resources.premium.until }}
      </p>
      <p>{{ t("PremiumContinuation.CurrentLimit") }}</p>
      <button
        v-if="checkResources"
        type="button"
        :disabled="busy"
        @click="act(() => checkResources!())"
      >
        {{ t("PremiumContinuation.CheckResources") }}
      </button>
    </div>
    <p v-else>{{ t("PremiumContinuation.NoResources") }}</p>
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
textarea:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>
