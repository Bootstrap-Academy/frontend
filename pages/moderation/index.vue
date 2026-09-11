<script setup lang="ts">
import { useI18n } from "vue-i18n";
definePageMeta({ layout: "inner" });
const { t } = useI18n(),
  m = useModeration();
const selected = ref(""),
  text = ref(""),
  error = ref(""),
  busy = ref(false);
const invoiceNumber = ref(""),
  creditMonth = ref("");
const orderId = ref(""),
  eventId = ref(""),
  deletionConfirmed = ref(false),
  statementElement = ref<HTMLElement>();
const rowKey = (row: ModerationMessage) => `${row.source}:${row.id}`;
const current = computed(() => m.rows.value.find((row) => rowKey(row) === selected.value));
const fields = [
  "outcome",
  "rationale",
  "text",
  "ground",
  "rule_version",
  "scope",
  "ends_at",
  "automation",
  "review_assessment",
  "misconduct_facts",
  "proportionality",
  "hearing",
  "article23_applicability",
  "article23_basis",
  "redress",
];
type Intent = {
  source: ModerationSource;
  case_id: string;
  message_id: string;
  id: string;
  decision_id: string;
  text: string;
  status: "unconfirmed" | "confirmed";
};
const pending = ref<Record<string, Intent>>({});
const storageKey = () => `moderation-complaints:${m.recipient.value}:${m.scope.value}`;
const intentKey = (row: ModerationMessage) =>
  `${row.source}:${row.case_id}:${row.audience}:${row.decision_id}`;
const intent = computed(() =>
  current.value ? pending.value[intentKey(current.value)] : undefined
);
const receipt = computed(() => (intent.value?.status === "confirmed" ? intent.value.id : ""));
let alive = true,
  presentationGeneration = 0;
let observer: IntersectionObserver | undefined;
onBeforeUnmount(() => {
  alive = false;
  presentationGeneration++;
  observer?.disconnect();
});
function restorePending() {
  if (!import.meta.client || !m.recipient.value) {
    pending.value = {};
    return;
  }
  try {
    pending.value = JSON.parse(sessionStorage.getItem(storageKey()) || "{}");
  } catch {
    pending.value = {};
  }
}
watch([m.recipient, m.scope], restorePending);
async function refresh() {
  try {
    await m.load();
    if (alive) error.value = "";
  } catch {
    if (alive) error.value = t("Moderation.LoadFailed");
  }
}
function choose(row: ModerationMessage) {
  selected.value = rowKey(row);
  text.value = pending.value[intentKey(row)]?.text || "";
}
// Render is not read. Wait for the exact current statement to intersect the
// foreground viewport and survive two animation frames. Interrupted views keep
// access timing unknown; an API response/list/export never starts the clock.
watch(
  current,
  async (row) => {
    const generation = ++presentationGeneration,
      valid = m.guard();
    observer?.disconnect();
    if (!row || row.informed_at || !row.decision_id) return;
    const identity = rowKey(row),
      statement = JSON.stringify(row.statement);
    await nextTick();
    if (!alive || generation !== presentationGeneration || !valid() || !statementElement.value)
      return;
    let sending = false;
    observer = new IntersectionObserver(async (entries) => {
      if (sending || !entries.some((entry) => entry.isIntersecting)) return;
      sending = true;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const element = statementElement.value,
        rect = element?.getBoundingClientRect();
      if (
        !alive ||
        generation !== presentationGeneration ||
        !valid() ||
        document.visibilityState !== "visible" ||
        !element?.isConnected ||
        element.dataset.message !== identity ||
        !current.value ||
        rowKey(current.value) !== identity ||
        JSON.stringify(current.value?.statement) !== statement ||
        !rect ||
        rect.bottom <= 0 ||
        rect.top >= innerHeight
      ) {
        sending = false;
        return;
      }
      try {
        await m.opened(row);
        if (alive && generation === presentationGeneration && valid()) await refresh();
      } catch {
        if (alive && generation === presentationGeneration && valid())
          error.value = t("Moderation.OpenNotRecorded");
      }
    });
    observer.observe(statementElement.value);
  },
  { flush: "post" }
);
async function complain() {
  const row = current.value;
  if (!row?.decision_id || busy.value || !text.value.trim() || receipt.value || !m.recipient.value)
    return;
  const key = intentKey(row),
    store = storageKey(),
    valid = m.guard();
  const command: Intent = pending.value[key] || {
    source: row.source,
    case_id: row.case_id,
    message_id: row.id,
    id: crypto.randomUUID(),
    decision_id: row.decision_id,
    text: text.value,
    status: "unconfirmed",
  };
  pending.value = { ...pending.value, [key]: command };
  // Persist the exact UUID and payload before sending. Ambiguous outcomes keep
  // this request available across navigation/reload for an exact replay.
  sessionStorage.setItem(store, JSON.stringify(pending.value));
  busy.value = true;
  try {
    const response = await m.request(`/complaints/${command.source}`, {
      method: "POST",
      body: { id: command.id, decision_id: command.decision_id, text: command.text },
    });
    if (!valid()) return;
    if (response.receipt !== command.id || response.status !== "pending_human_review")
      throw new Error("Unconfirmed complaint receipt");
    pending.value = { ...pending.value, [key]: { ...command, status: "confirmed" } };
    sessionStorage.setItem(store, JSON.stringify(pending.value));
    await refresh();
  } catch {
    if (alive && valid() && current.value && intentKey(current.value) === key)
      error.value = t("Moderation.ComplaintUnconfirmed");
  } finally {
    if (alive) busy.value = false;
  }
}
watch(m.epoch, () => {
  presentationGeneration++;
  observer?.disconnect();
  selected.value = text.value = "";
  pending.value = {};
});
async function action(fn: () => Promise<any>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
  } catch (e: any) {
    error.value = t(
      e?.data?.detail?.cancellation_committed === true
        ? "Moderation.CancellationPending"
        : "Moderation.RequestFailed"
    );
  } finally {
    busy.value = false;
  }
}
async function erase() {
  if (!deletionConfirmed.value) return;
  await action(async () => {
    await m.request("/account", { method: "DELETE" });
    deletionConfirmed.value = false;
    await refresh();
  });
}
function downloadCase() {
  const row = current.value;
  if (!row) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(row, null, 2)], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `moderation-${row.case_id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const print = () => window.print();
onMounted(async () => {
  try {
    m.importFragment();
    if (!m.active.value) return await navigateTo("/moderation/access");
    await refresh();
  } catch {
    error.value = t("Moderation.LoadFailed");
  }
});
</script>
<template>
  <main class="moderation-page mx-auto grid max-w-4xl gap-6 p-6">
    <h1>{{ t("Moderation.Title") }}</h1>
    <p v-if="m.recipient.value">
      {{ t("Moderation.RecipientIdentity") }} {{ m.recipient.value }} ·
      {{ m.scope.value === "case" ? t("Moderation.CaseAccess") : t("Moderation.Rights") }}
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
    <NuxtLink to="/moderation/access">{{ t("Moderation.ChangeAccess") }}</NuxtLink>
    <p v-if="!m.available.value" role="status">{{ t("Moderation.Partial") }}</p>
    <p v-if="!m.rows.value.length">{{ t("Moderation.Empty") }}</p>
    <nav class="grid gap-3 print:hidden" :aria-label="t('Moderation.Cases')">
      <button
        v-for="row in m.rows.value"
        :key="rowKey(row)"
        type="button"
        class="text-left"
        @click="choose(row)"
      >
        {{ row.case_id }} ·
        {{ row.audience === "author" ? t("Moderation.Author") : t("Moderation.Notifier") }} ·
        {{ row.statement.outcome || row.statement.status }}
        <span v-if="!row.informed_at"> · {{ t("Moderation.Unopened") }}</span>
      </button>
    </nav>
    <article
      v-if="current"
      ref="statementElement"
      :data-message="rowKey(current)"
      :key="rowKey(current)"
      class="grid min-w-0 gap-4 break-words"
    >
      <h2>{{ t("Moderation.Case") }} {{ current.case_id }}</h2>
      <p>{{ current.current ? t("Moderation.Current") : t("Moderation.History") }}</p>
      <dl class="grid gap-3">
        <template v-for="field in fields" :key="field"
          ><div v-if="current.statement[field] != null">
            <dt class="font-bold">{{ t(`Moderation.Field.${field}`) }}</dt>
            <dd class="whitespace-pre-wrap">{{ current.statement[field] }}</dd>
          </div></template
        >
      </dl>
      <p v-if="current.effective">
        {{ t("Moderation.Effective") }}:
        {{
          current.effective.withdrawn
            ? t("Moderation.Withdrawn")
            : current.effective.enabled
              ? t("Moderation.Accessible")
              : t("Moderation.Restricted")
        }}
      </p>
      <details v-if="current.audience === 'author' && current.content">
        <summary>{{ t("Moderation.ReviewedContent") }}</summary>
        <pre class="overflow-auto whitespace-pre-wrap text-sm">{{
          JSON.stringify(current.content, null, 2)
        }}</pre>
      </details>
      <p v-if="current.complaint_until">
        {{ t("Moderation.MinimumReview") }}
        {{ new Date(current.complaint_until).toLocaleString() }}. {{ t("Moderation.LaterReview") }}
      </p>
      <p v-else>{{ t("Moderation.NoClock") }}</p>
      <div class="flex flex-wrap gap-3 print:hidden">
        <button type="button" @click="print">{{ t("Moderation.Print") }}</button
        ><button type="button" @click="downloadCase">{{ t("Moderation.DownloadCase") }}</button>
      </div>
      <form v-if="current.decision_id" class="grid gap-3 print:hidden" @submit.prevent="complain">
        <label
          >{{ t("Moderation.Complaint")
          }}<textarea
            v-model="text"
            required
            maxlength="16000"
            rows="6"
            :disabled="busy || !!intent"
          />
        </label>
        <button type="submit" :disabled="busy || !!receipt">
          {{
            intent?.status === "unconfirmed"
              ? t("Moderation.RetryComplaint")
              : t("Moderation.SubmitComplaint")
          }}
        </button>
        <p v-if="intent?.status === 'unconfirmed'" role="status">
          {{ t("Moderation.PendingComplaint") }} {{ intent.id }}
        </p>
        <p v-if="receipt" role="status">{{ t("Moderation.Receipt") }} {{ receipt }}</p>
      </form>
    </article>
    <section v-if="m.scope.value === 'rights'" class="grid gap-4 print:hidden">
      <h2>{{ t("Moderation.Rights") }}</h2>
      <CommercialStatus
        :identity="`${m.epoch.value}:${m.recipient.value}`"
        :read="m.commercialSnapshot"
        :original="m.commercialStatement"
      />
      <CommercialAccess
        :identity="`${m.epoch.value}:${m.recipient.value}`"
        :personal-proof="m.commercialPersonalProof"
        :personal-read-context="m.commercialOriginalRead"
        :ordinary-read-context="m.commercialOrdinaryRead"
        :show-records="false"
      />
      <button
        type="button"
        :disabled="busy"
        @click="action(() => m.download('/export', 'account-and-moderation.json'))"
      >
        {{ t("Moderation.Export") }}
      </button>
      <label>{{ t("Moderation.Order") }}<input v-model="orderId" /></label>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="kind in [
            'terms',
            'withdrawal',
            'confirmation',
            'timing',
            'timing-original',
            'fulfillment',
            'fulfillment-original',
          ]"
          :key="kind"
          type="button"
          :disabled="busy || !orderId"
          @click="
            action(() =>
              m.download(
                `/purchases/${encodeURIComponent(orderId)}/documents/${kind}`,
                `${orderId}-${kind}.${['terms', 'withdrawal'].includes(kind) ? 'pdf' : 'txt'}`
              )
            )
          "
        >
          {{ kind }}
        </button>
      </div>
      <label
        >{{ t("Moderation.InvoiceNumber")
        }}<input v-model="invoiceNumber" inputmode="numeric" /></label
      ><button
        type="button"
        :disabled="busy || !/^[0-9]+$/.test(invoiceNumber)"
        @click="
          action(() =>
            m.download(`/finance/invoice/${invoiceNumber}/0`, `invoice-${invoiceNumber}.pdf`)
          )
        "
      >
        {{ t("Moderation.DownloadInvoice") }}
      </button>
      <label>{{ t("Moderation.CreditMonth") }}<input v-model="creditMonth" type="month" /></label
      ><button
        type="button"
        :disabled="busy || !creditMonth"
        @click="
          action(() =>
            m.download(
              `/finance/credit-note/${creditMonth.split('-')[0]}/${Number(creditMonth.split('-')[1])}`,
              `credit-note-${creditMonth}.pdf`
            )
          )
        "
      >
        {{ t("Moderation.DownloadCredit") }}
      </button>
      <label>{{ t("Moderation.Event") }}<input v-model="eventId" /></label
      ><button
        type="button"
        :disabled="busy || !eventId"
        @click="
          action(() => m.request(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' }))
        "
      >
        {{ t("Moderation.CancelEvent") }}
      </button>
      <form class="grid gap-3" @submit.prevent="erase">
        <label class="flex gap-3"
          ><input v-model="deletionConfirmed" type="checkbox" required />{{
            t("Moderation.EraseConfirmation")
          }}</label
        ><button type="submit" :disabled="busy || !deletionConfirmed">
          {{ t("Moderation.Erase") }}
        </button>
      </form>
    </section>
    <div class="grid gap-3 print:hidden">
      <NuxtLink to="/vertrag-kuendigen">{{ t("Moderation.CancelContract") }}</NuxtLink
      ><NuxtLink to="/vertrag-widerrufen">{{ t("Moderation.WithdrawContract") }}</NuxtLink
      ><a href="mailto:hallo@bootstrap.academy">hallo@bootstrap.academy</a
      ><button
        type="button"
        :disabled="busy"
        @click="
          action(async () => {
            await m.revoke();
            await navigateTo('/moderation/access');
          })
        "
      >
        {{ t("Moderation.EndAccess") }}
      </button>
    </div>
  </main>
</template>
<style scoped>
label {
  display: grid;
  gap: 0.5rem;
}
input,
textarea {
  color: #111827;
  background: white;
  border: 1px solid #94a3b8;
  border-radius: 0.3rem;
  padding: 0.65rem;
  min-width: 0;
}
button {
  border: 1px solid currentColor;
  border-radius: 0.3rem;
  padding: 0.65rem;
}
button:disabled {
  opacity: 0.5;
}
pre {
  overflow-wrap: anywhere;
}
</style>
