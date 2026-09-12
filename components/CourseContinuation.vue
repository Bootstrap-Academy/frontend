<script setup lang="ts">
import { onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  createCourseContinuation,
  type CourseContinuationBody,
} from "../composables/courseContinuation";

const props = defineProps<{
  identity: string;
  owner: { case_id: string; subject: string };
  snapshot: () => Promise<unknown>;
  summary: () => Promise<unknown>;
  rights: (source: string) => Promise<unknown>;
  continueCourse: (body: CourseContinuationBody) => Promise<unknown>;
  learningSubject?: string | null;
}>();
const emit = defineEmits<{ refreshCourses: [] }>();
const { t } = useI18n();
const client = shallowRef<ReturnType<typeof createCourseContinuation> | null>(null);
const busy = ref(false),
  acknowledged = ref(false),
  recovery = ref(""),
  notice = ref("");
let alive = true;
watch(
  () => [props.identity, props.owner.case_id, props.owner.subject],
  () => {
    client.value?.clear();
    busy.value = false;
    acknowledged.value = false;
    recovery.value = notice.value = "";
  },
  { flush: "sync" }
);
onMounted(() => {
  client.value = createCourseContinuation({
    owner: () => props.owner,
    identity: () => props.identity,
    ambient: moderationAmbientIdentity,
    storage: sessionStorage,
    snapshot: props.snapshot,
    summary: props.summary,
    rights: props.rights,
    continueCourse: props.continueCourse,
  });
  try {
    client.value.restore();
  } catch {
    notice.value = t("CourseContinuation.Failed");
  }
});
onScopeDispose(() => {
  alive = false;
  client.value?.dispose();
});
async function act(action: () => void | Promise<void>, preparation = false) {
  if (busy.value) return;
  const identity = props.identity,
    owner = { ...props.owner };
  const currentView = () =>
    alive &&
    identity === props.identity &&
    owner.case_id === props.owner.case_id &&
    owner.subject === props.owner.subject;
  busy.value = true;
  notice.value = "";
  if (preparation) acknowledged.value = false;
  try {
    await action();
  } catch (cause: any) {
    if (currentView())
      notice.value = t(
        cause.message === "pending_request"
          ? "CourseContinuation.Pending"
          : cause.message === "existing_request"
            ? "CourseContinuation.Existing"
            : ["source_changed", "right_changed", "target_changed"].includes(cause.message)
              ? "CourseContinuation.Changed"
              : "CourseContinuation.Failed"
      );
  } finally {
    if (currentView()) {
      busy.value = false;
      // A recorded withdrawal closes the old player; it never replaces the
      // separate learning request, key, receipt or resource state.
      if (
        client.value?.current.value?.state === "withdrawn" &&
        client.value.current.value.successor === props.learningSubject
      )
        emit("refreshCourses");
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
    anchor.download = "bootstrap-course-continuation.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    notice.value = t("CourseContinuation.Failed");
  }
}
async function importRecovery() {
  await act(() => client.value!.importRecovery(recovery.value), true);
  recovery.value = "";
}
function existing(right: string, target: string) {
  return client.value?.grants.value.find(
    (g) => g.original_contract === right && g.successor === target
  );
}
</script>

<template>
  <section
    class="grid gap-3 rounded border p-4 text-body"
    aria-labelledby="course-continuation-title"
  >
    <h3 id="course-continuation-title">{{ t("CourseContinuation.Title") }}</h3>
    <p>{{ t("CourseContinuation.Scope") }}</p>
    <button type="button" :disabled="!client || busy" @click="act(() => client!.load())">
      {{ t("CourseContinuation.Load") }}
    </button>
    <template v-if="client?.loaded.value">
      <p v-if="!client.sources.value.length">{{ t("CourseContinuation.NoSources") }}</p>
      <div v-for="(subject, index) in client.sources.value" :key="subject" class="grid gap-2">
        <p>{{ t("AccessCopy.PreviousAccess", { n: index + 1 }) }}</p>
        <details>
          <summary>{{ t("AccessCopy.Reference") }}</summary>
          <p class="break-all">{{ subject }}</p>
        </details>
        <button type="button" :disabled="busy" @click="act(() => client!.loadRights(subject))">
          {{ t("CourseContinuation.LoadRights") }}
        </button>
      </div>
      <p v-if="!client.targets.value.length">{{ t("CourseContinuation.NoTarget") }}</p>
    </template>
    <template v-if="client?.source.value">
      <p v-if="client.rightsLoaded.value && !client.rights.value.length">
        {{ t("CourseContinuation.NoRights") }}
      </p>
      <div
        v-for="right in client.rights.value"
        :key="right.id"
        class="grid gap-2 rounded border p-3"
      >
        <h4 class="break-all">{{ t("CourseContinuation.Course") }}: {{ right.course_id }}</h4>
        <p>
          {{
            t(
              right.original.observed_course_access
                ? "CourseContinuation.RecordedAccess"
                : "CourseContinuation.StartedAccess"
            )
          }}
        </p>
        <p v-if="right.current_subject">{{ t("AccessCopy.CourseAssigned") }}</p>
        <div v-for="(target, index) in client.targets.value" :key="target" class="grid gap-2">
          <p>{{ t("AccessCopy.LearningArea", { n: index + 1 }) }}</p>
          <details>
            <summary>{{ t("AccessCopy.Reference") }}</summary>
            <p class="break-all">{{ target }}</p>
          </details>
          <button
            v-if="existing(right.id, target)"
            type="button"
            :disabled="
              busy ||
              (client.blocked.value &&
                client.pending.value?.body.command_id !== existing(right.id, target)!.id)
            "
            @click="act(() => client!.recoverGrant(existing(right.id, target)!.id), true)"
          >
            {{ t("CourseContinuation.RecoverExisting") }}
          </button>
          <button
            v-else
            type="button"
            :disabled="
              busy ||
              client.blocked.value ||
              (right.current_subject !== null && right.current_subject !== target)
            "
            @click="act(() => client!.prepare(right.id, target), true)"
          >
            {{ t("CourseContinuation.Prepare") }}
          </button>
        </div>
      </div>
    </template>
    <details v-if="client?.grants.value.length">
      <summary>{{ t("CourseContinuation.RecordedCommands") }}</summary>
      <div v-for="grant in client.grants.value" :key="grant.id" class="grid gap-2 py-3">
        <p class="break-all">
          {{ grant.original_scope.course_id }} — {{ t("CourseContinuation.Target") }}:
          {{ grant.successor }}
        </p>
        <p>{{ t(`CourseContinuation.State.${grant.state}`) }}</p>
        <button
          type="button"
          :disabled="
            busy || (client.blocked.value && client.pending.value?.body.command_id !== grant.id)
          "
          @click="act(() => client!.recoverGrant(grant.id), true)"
        >
          {{ t("CourseContinuation.RecoverExisting") }}
        </button>
      </div>
    </details>
    <details>
      <summary>{{ t("CourseContinuation.Restore") }}</summary>
      <form class="grid gap-2" @submit.prevent="importRecovery">
        <label for="course-continuation-recovery">{{ t("CourseContinuation.Recovery") }}</label>
        <textarea
          id="course-continuation-recovery"
          v-model="recovery"
          required
          autocomplete="off"
          spellcheck="false"
        />
        <button type="submit" :disabled="!client || busy">
          {{ t("CourseContinuation.Restore") }}
        </button>
      </form>
    </details>
    <template v-if="client?.pending.value">
      <p class="break-all">
        {{ t("CourseContinuation.Course") }}: {{ client.pending.value.original.course_id }}
      </p>
      <p>
        {{
          client.targets.value.includes(client.pending.value.body.successor)
            ? t("AccessCopy.SelectedLearningArea", {
                n: client.targets.value.indexOf(client.pending.value.body.successor) + 1,
              })
            : t("AccessCopy.SelectedAccess")
        }}
      </p>
      <details>
        <summary>{{ t("AccessCopy.SelectedReference") }}</summary>
        <p class="break-all">{{ client.pending.value.body.successor }}</p>
      </details>
      <p>{{ t("CourseContinuation.Keep") }}</p>
      <button type="button" :disabled="busy" @click="saveFile">
        {{ t("CourseContinuation.Save") }}
      </button>
      <label
        ><input v-model="acknowledged" type="checkbox" /> {{ t("CourseContinuation.Saved") }}</label
      >
      <button type="button" :disabled="busy || !acknowledged" @click="act(() => client!.submit())">
        {{
          t(
            client.pending.value.state === "prepared"
              ? "CourseContinuation.Continue"
              : "CourseContinuation.Retry"
          )
        }}
      </button>
      <p v-if="client.current.value && client.loaded.value" role="status">
        {{ t(`CourseContinuation.State.${client.current.value.state}`) }}
      </p>
      <p v-else role="status">
        {{
          t(
            client.pending.value.state === "refused"
              ? "CourseContinuation.Refused"
              : "CourseContinuation.Unconfirmed"
          )
        }}
      </p>
      <details v-if="client.pending.value.receipts.length">
        <summary>{{ t("CourseContinuation.Receipts") }}</summary>
        <div
          v-for="receipt in client.pending.value.receipts"
          :key="receipt.id"
          class="grid gap-2 py-2"
        >
          <p>
            {{ receipt.received_at }} — {{ t(`CourseContinuation.State.${receipt.receipt.state}`) }}
          </p>
          <p v-if="receipt.receipt.original_result?.access_granted">
            {{ t("CourseContinuation.HistoricalSuccess") }}
          </p>
        </div>
      </details>
    </template>
    <button v-if="learningSubject" type="button" :disabled="busy" @click="emit('refreshCourses')">
      {{ t("CourseContinuation.RefreshCourses") }}
    </button>
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
