<template>
  <main class="learning-page">
    <header class="learning-heading">
      <NuxtLink to="/dashboard" class="back-link">← {{ t("LearningRooms.Back") }}</NuxtLink>
      <p v-if="view?.status === 'ready'" class="save-status" aria-live="polite">
        {{
          t(
            view.saving
              ? "LearningRooms.Saving"
              : view.dirty
                ? "LearningRooms.Unsaved"
                : "LearningRooms.Saved"
          )
        }}
      </p>
    </header>
    <section v-if="reauthRequired" class="room-message" role="alert">
      <p>{{ t("LearningRooms.Session") }}</p>
      <p v-if="recoveryError">{{ t("LearningRooms.RecoveryError") }}</p>
      <button type="button" :disabled="exercisePosting" @click="reauthenticate">
        {{ t("LearningRooms.SignIn") }}
      </button>
    </section>
    <div
      v-if="recovering || !view || ['idle', 'loading'].includes(view.status)"
      class="room-state"
      role="status"
    >
      {{ t("LearningRooms.Loading") }}
    </div>
    <section v-else-if="view.status === 'disabled'" class="room-state">
      <h1>{{ t("LearningRooms.Unavailable") }}</h1>
      <NuxtLink to="/dashboard" class="primary-link">{{ t("LearningRooms.Back") }}</NuxtLink>
    </section>
    <section v-else-if="view.status === 'error'" class="room-state" role="alert">
      <p>{{ t("LearningRooms.LoadError") }}</p>
      <button type="button" @click="data.next(view.path?.id)">
        {{ t("LearningRooms.Retry") }}
      </button>
    </section>
    <template v-else>
      <div class="learning-path">
        <label for="learning-path">{{ t("LearningRooms.LearningPath") }}</label>
        <select
          id="learning-path"
          :value="view.path?.id"
          :disabled="
            exercisePosting ||
            view.saving ||
            view.completing ||
            view.conflict ||
            view.completionPending
          "
          @change="changePath(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="path in view.paths" :key="path.id" :value="path.id">
            {{ localized(path.title) }}
          </option>
        </select>
      </div>
      <section v-if="view.conflict" class="room-message" role="alert">
        <p>{{ t("LearningRooms.Conflict") }}</p>
        <div class="message-actions">
          <button type="button" @click="data.resolveConflict(false)">
            {{ t("LearningRooms.LoadSaved") }}
          </button>
          <button type="button" class="quiet-button" @click="data.resolveConflict(true)">
            {{ t("LearningRooms.KeepMine") }}
          </button>
        </div>
      </section>
      <section v-else-if="view.error && !reauthRequired" class="room-message" role="alert">
        <p>{{ t(`LearningRooms.${view.error}`) }}</p>
        <button v-if="view.error === 'Session'" type="button" @click="reauthenticate">
          {{ t("LearningRooms.SignIn") }}
        </button>
        <button v-else-if="view.completionPending" type="button" @click="data.complete('complete')">
          {{ t("LearningRooms.Retry") }}
        </button>
        <button v-else-if="view.dirty" type="button" @click="data.save()">
          {{ t("LearningRooms.SaveAgain") }}
        </button>
      </section>
      <article v-if="view.room" class="learning-room">
        <div class="room-heading">
          <h1>{{ localized(view.room.unit.title) }}</h1>
        </div>
        <div v-if="finished" class="finished-room" role="status">
          <p>
            {{
              t(
                view.room.progress.status === "skipped"
                  ? "LearningRooms.Skipped"
                  : view.room.progress.result?.kind === "solved"
                    ? "LearningRooms.ExerciseDone"
                    : "LearningRooms.IntroductionDone"
              )
            }}
          </p>
          <button type="button" @click="advance">{{ t("LearningRooms.Next") }}</button>
        </div>
        <LearningLoopExplorer
          v-else-if="view.room.unit.room === 'loop-explorer'"
          :key="roomKey"
          :content="content"
          :locale="locale"
          :state="view.draft"
          :disabled="locked"
          @change="edit"
          @complete="complete"
        />
        <LearningPercentageExplorer
          v-else-if="view.room.unit.room === 'percentage-explorer'"
          :key="roomKey"
          :content="content"
          :locale="locale"
          :state="view.draft"
          :disabled="locked"
          @change="edit"
          @complete="complete"
        />
        <LearningExerciseRoom
          ref="exerciseComponent"
          v-else-if="view.room.unit.room === 'exercise' && view.room.unit.exercise"
          :key="roomKey"
          :reference="view.room.unit.exercise"
          :content="content"
          :state="view.draft"
          :request="request"
          :save="data.save"
          :user-id="user?.id || ''"
          :disabled="locked"
          @change="edit"
          @posting="exercisePosting = $event"
          @complete="complete"
          @skip="advance"
        />
        <footer v-if="!finished && view.room.unit.room !== 'exercise'" class="room-footer">
          <button
            type="button"
            class="quiet-button"
            :disabled="locked"
            @click="data.complete('skip')"
          >
            {{ t("LearningRooms.AlreadyKnow") }}
          </button>
        </footer>
      </article>
      <section v-else class="room-state">
        <h1>
          {{
            t(
              view.emptyReason === "completed"
                ? "LearningRooms.PathDone"
                : "LearningRooms.NoNextExercise"
            )
          }}
        </h1>
        <p>{{ t("LearningRooms.PathDoneBody") }}</p>
        <NuxtLink to="/dashboard" class="primary-link">{{ t("LearningRooms.Back") }}</NuxtLink>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { LocalizedText } from "~/types/learningRooms";

definePageMeta({ middleware: ["auth"] });
const { t, locale } = useI18n();
useHead(() => ({ title: t("LearningRooms.Title") }));
const router = useRouter();
const {
  view,
  data,
  edit,
  request,
  owner,
  user,
  reauthRequired,
  reauthenticate,
  recoveryError,
  recovering,
} = useLearningRooms();
const language = computed(() => (locale.value.startsWith("de") ? "de" : "en"));
const localized = (value?: LocalizedText) => value?.[language.value] || value?.en || "";
const content = computed(
  () => view.value?.room?.unit.content?.[language.value] || view.value?.room?.unit.content || {}
);
const finished = computed(() =>
  ["completed", "skipped"].includes(view.value?.room?.progress.status || "")
);
const locked = computed(
  () => !!(view.value?.completing || view.value?.conflict || view.value?.completionPending)
);
const sessionRevision = ref(0);
const exercisePosting = ref(false);
const exerciseComponent = ref<{ cancelPreparation: () => void } | null>(null);
watch(
  owner,
  () => {
    sessionRevision.value++;
    exercisePosting.value = false;
  },
  { flush: "sync" }
);
const roomKey = computed(() => `${sessionRevision.value}:${view.value?.room?.unit.id || ""}`);
watch(
  roomKey,
  () => {
    exercisePosting.value = false;
  },
  { flush: "sync" }
);
async function complete(answer: Record<string, any>) {
  await data.complete("complete", answer);
}
async function advance() {
  if (exercisePosting.value) return;
  exerciseComponent.value?.cancelPreparation();
  if (view.value?.room) await data.next(view.value.path?.id, view.value.room.unit.id);
}
async function changePath(path: string) {
  if (exercisePosting.value) return;
  exerciseComponent.value?.cancelPreparation();
  if (await data.next(path)) await router.replace({ path: "/learn", query: { path } });
}
onBeforeRouteLeave(async () => {
  if (!owner.value) return true;
  if (exercisePosting.value) return false;
  exerciseComponent.value?.cancelPreparation();
  if (view.value?.completionPending || view.value?.conflict) return false;
  if (view.value?.dirty || view.value?.saving) return await data.save();
  return true;
});
function beforeUnload(event: BeforeUnloadEvent) {
  if (
    !exercisePosting.value &&
    !view.value?.dirty &&
    !view.value?.saving &&
    !view.value?.completionPending
  )
    return;
  event.preventDefault();
  event.returnValue = "";
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>

<style scoped>
.learning-page {
  width: calc(100% - 48px);
  max-width: 1056px;
  margin: 32px auto 80px;
  color: #edf3fb;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.learning-page p {
  color: inherit;
  font-family: inherit;
  line-height: 1.6;
}
.learning-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.back-link {
  color: #a5ded6;
  font-size: 0.9375rem;
}
.save-status {
  color: #acc2d2 !important;
  font-size: 0.8125rem;
}
.learning-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.learning-path label {
  color: #b6cbdc;
  font-size: 0.875rem;
}
select {
  flex: 1;
  max-width: 430px;
  min-width: 0;
  min-height: 48px;
  background: #142a3e;
  border: 1px solid #3a546b;
  border-radius: 10px;
  padding: 12px;
  color: #edf3fb;
  font: inherit;
}
.learning-room {
  padding: clamp(20px, 4vw, 44px);
  min-width: 0;
  border: 1px solid #2e4b60;
  border-radius: 22px;
  background: #122539;
}
.room-heading {
  margin-bottom: 30px;
}
h1 {
  font:
    650 clamp(1.6rem, 3vw, 2.25rem)/1.25 Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  letter-spacing: -0.025em;
  margin-top: 8px;
  overflow-wrap: anywhere;
}
.room-state {
  min-height: 280px;
  padding: 32px 0;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 20px;
}
.room-message {
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #9c8b55;
  border-radius: 12px;
  background: #2a2d2a;
  display: grid;
  gap: 16px;
}
.message-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
button,
.primary-link {
  display: inline-block;
  width: fit-content;
  min-height: 46px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #0cc9ab;
  color: #07312d;
  font:
    650 1rem/1.4 Inter,
    sans-serif;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.quiet-button {
  background: transparent;
  color: #b1d7d6;
  border: 1px solid #3e6272;
}
.room-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #2e4b60;
  margin-top: 30px;
  padding-top: 20px;
}
.finished-room {
  display: grid;
  gap: 22px;
  padding: 16px 0;
}
:is(button, a, select):focus-visible {
  outline: 2px solid #7de5d0;
  outline-offset: 4px;
}
@media (max-width: 600px) {
  .learning-page {
    width: calc(100% - 28px);
    margin-top: 24px;
  }
  .learning-path {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  select {
    max-width: 100%;
  }
  .learning-room {
    border-radius: 16px;
  }
}
</style>
