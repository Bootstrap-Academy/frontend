<template>
  <section class="lesson-activity">
    <div v-if="reauthRequired" role="alert">
      <p>{{ copy.session }}</p>
      <button type="button" :disabled="busy" @click="signIn">{{ copy.signIn }}</button>
    </div>
    <p
      v-if="roomSource && (recovering || !view || ['idle', 'loading'].includes(view.status))"
      role="status"
    >
      {{ copy.loading }}
    </p>
    <div v-else-if="roomSource && ['error', 'disabled'].includes(view?.status || '')" role="alert">
      <p>{{ copy.loadError }}</p>
      <button type="button" @click="retry">{{ copy.retry }}</button>
    </div>
    <div v-else-if="view?.conflict" role="alert">
      <p>{{ copy.conflict }}</p>
      <button type="button" @click="data.resolveConflict(false)">{{ copy.loadSaved }}</button>
      <button type="button" @click="data.resolveConflict(true)">{{ copy.keepMine }}</button>
    </div>
    <div v-else-if="view?.reviewStarting || view?.reviewPending" role="status">
      <p>{{ view.reviewStarting ? copy.loading : copy.loadError }}</p>
      <button v-if="!view.reviewStarting" type="button" @click="data.retryReview()">
        {{ copy.retry }}
      </button>
    </div>
    <template v-else>
      <div v-if="finished" role="status">
        <p>{{ copy.done }}</p>
        <button type="button" @click="emit('next')">{{ copy.next }}</button>
      </div>
      <template v-else>
        <p v-if="activity.source.kind === 'lecture' && activity.content.description">
          {{ activity.content.description }}
        </p>
        <ActivityHost
          v-if="renderActivity && (activity.source.kind !== 'lecture' || activity.kind === 'video')"
          ref="host"
          :key="`${owner}:${activity.id}:${view?.room?.progress.review_id || 'initial'}`"
          :activity="renderActivity"
          :state="roomSource ? view?.draft || {} : draft"
          :locale="locale"
          :disabled="locked"
          :request="request"
          :save="save"
          :user-id="user?.id || ''"
          :review-id="view?.room?.progress.review_id || undefined"
          :legacy-video="legacyVideo"
          @change="change"
          @complete="complete"
          @posting="posting = $event"
          @skip="emit('next')"
        />
        <CoursePractice
          v-if="activity.source.kind === 'lecture'"
          source="course"
          :source-id="activity.source.course_id"
          :section="activity.source.section_id"
          :lecture="activity.source.lecture_id"
          :heading="copy.practice"
          hide-empty
        />
        <button
          v-if="activity.source.kind === 'lecture'"
          type="button"
          :disabled="locked"
          @click="complete({})"
        >
          {{ copy.finish }}
        </button>
        <button v-else-if="allowSkip" type="button" :disabled="locked" @click="skip">
          {{ copy.alreadyKnow }}
        </button>
      </template>
      <div v-if="saveError || view?.error" role="alert">
        <p>{{ copy.saveError }}</p>
        <button v-if="view?.completionPending" type="button" :disabled="busy" @click="complete({})">
          {{ copy.retry }}
        </button>
        <button v-else type="button" :disabled="busy" @click="save">{{ copy.retry }}</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Course, Lecture } from "~/types/courseTypes";
import type {
  LearningActivity,
  LearningActivityCompletion,
  LearningActivityHandle,
} from "~/types/learningActivities";
import { roomActivity } from "~/utils/learningActivityAdapters";
import ActivityHost from "./ActivityHost.vue";

const props = defineProps<{ activity: LearningActivity; course: Course; locale: string }>();
const emit = defineEmits<{ next: []; completed: [id: string]; busy: [active: boolean] }>();
const roomSource = props.activity.source.kind === "room" ? props.activity.source : null;
const {
  view,
  data,
  edit,
  request,
  owner,
  user,
  reauthRequired,
  reauthenticate,
  recovering,
  retry,
} = useLearningRooms({
  ...(roomSource
    ? {
        selection: {
          path: props.course.learning_path_id || undefined,
          courseId: props.course.id,
          unitId: roomSource.unit_id,
        },
      }
    : {}),
  syncLocation: false,
  loadRoom: !!roomSource,
});
const host = ref<LearningActivityHandle | null>(null);
const draft = ref<Record<string, any>>({});
const posting = ref(false);
const completing = ref(false);
const completed = ref(props.activity.completed === true);
const saveError = ref(false);
let alive = true;
let draftOwner = "";
const draftKey = computed(() => {
  const source = props.activity.source;
  return source.kind === "challenge" && user.value?.id
    ? `academy-challenge-draft:${user.value.id}:${source.type}:${source.task_id}:${source.subtask_id}`
    : "";
});
const busy = computed(
  () =>
    posting.value || completing.value || !!view.value?.completing || !!view.value?.reviewStarting
);
const locked = computed(
  () =>
    completing.value ||
    !!view.value?.completing ||
    !!view.value?.conflict ||
    !!view.value?.completionPending
);
const finished = computed(() =>
  roomSource
    ? ["completed", "skipped"].includes(view.value?.room?.progress.status || "")
    : completed.value
);
const renderActivity = computed(() =>
  roomSource ? (view.value?.room ? roomActivity(view.value.room) : null) : props.activity
);
const allowSkip = computed(
  () =>
    roomSource &&
    (renderActivity.value?.skip_allowed ?? renderActivity.value?.presentation?.allow_skip)
);
const legacyVideo = computed(() => {
  const source = props.activity.source;
  return source.kind === "lecture"
    ? {
        course: props.course,
        lecture: props.activity.content as Lecture,
        section: props.course.sections.find((section) => section.id === source.section_id),
      }
    : undefined;
});
const copy = computed(() =>
  props.locale.startsWith("de")
    ? {
        loading: "Wird geladen …",
        loadError: "Das Laden hat nicht geklappt.",
        retry: "Nochmal versuchen",
        session: "Melde dich bitte nochmal an. Dein Stand bleibt erhalten.",
        signIn: "Anmelden",
        conflict: "Dein Stand wurde inzwischen woanders geändert.",
        loadSaved: "Gespeicherten Stand laden",
        keepMine: "Meinen Stand behalten",
        done: "Abgeschlossen",
        next: "Weiter",
        finish: "Fertig",
        alreadyKnow: "Kenne ich schon",
        practice: "Üben",
        saveError: "Dein Stand konnte noch nicht gespeichert werden.",
      }
    : {
        loading: "Loading …",
        loadError: "This couldn't be loaded.",
        retry: "Try again",
        session: "Please sign in again. Your work is kept.",
        signIn: "Sign in",
        conflict: "Your saved work has changed elsewhere.",
        loadSaved: "Load saved work",
        keepMine: "Keep my work",
        done: "Completed",
        next: "Continue",
        finish: "Done",
        alreadyKnow: "I know this",
        practice: "Practice",
        saveError: "Your work hasn't been saved yet.",
      }
);
watch(busy, (value) => emit("busy", value), { immediate: true });
watch(
  owner,
  () => {
    posting.value = completing.value = false;
    draft.value = {};
    draftOwner = user.value?.id || "";
    if (!draftKey.value) return;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(draftKey.value) || "null");
      if (saved?.owner === draftOwner && saved.state && typeof saved.state === "object")
        draft.value = saved.state;
    } catch {
      /* Opening an activity remains possible; submission requires a successful checkpoint. */
    }
  },
  { immediate: true, flush: "sync" }
);
function change(state: Record<string, any>) {
  if (roomSource) edit(state);
  else {
    draft.value = state;
    void save();
  }
}
async function save() {
  if (roomSource) return await data.save();
  if (props.activity.source.kind !== "challenge") return true;
  if (!alive || !draftKey.value || draftOwner !== user.value?.id) return false;
  try {
    window.sessionStorage.setItem(
      draftKey.value,
      JSON.stringify({ owner: draftOwner, state: draft.value })
    );
    saveError.value = false;
    return true;
  } catch {
    saveError.value = true;
    return false;
  }
}
async function complete(result: LearningActivityCompletion) {
  if (!alive || completing.value || view.value?.completing) return;
  if (roomSource) {
    if (await data.complete("complete", result.answer, result.attempt_id)) {
      emit("completed", props.activity.id);
      emit("next");
    }
    return;
  }
  if (props.activity.source.kind === "challenge") {
    if (!(await save())) return;
    completed.value = true;
    emit("completed", props.activity.id);
    emit("next");
    return;
  }
  const source = props.activity.source;
  const expectedOwner = owner.value;
  completing.value = true;
  saveError.value = false;
  const current = () => alive && expectedOwner === owner.value;
  try {
    await request.value(
      `/skills/courses/${encodeURIComponent(source.course_id)}/lectures/${encodeURIComponent(source.lecture_id)}/complete`,
      "PUT"
    );
    if (!current()) return;
    completed.value = true;
  } catch {
    if (!current()) return;
    try {
      const course = await request.value(`/skills/courses/${encodeURIComponent(source.course_id)}`);
      if (!current()) return;
      completed.value =
        course.sections?.some((section: any) =>
          section.lectures?.some(
            (lecture: any) => lecture.id === source.lecture_id && lecture.completed === true
          )
        ) === true;
    } catch {
      /* A read reconciles uncertainty; completion is never automatically repeated. */
    }
    if (current()) saveError.value = !completed.value;
  } finally {
    if (current()) {
      completing.value = false;
      if (completed.value) {
        emit("completed", props.activity.id);
        emit("next");
      }
    }
  }
}
async function skip() {
  if (busy.value || !allowSkip.value) return;
  if (await data.complete("skip")) emit("next");
}
async function canLeave() {
  if (!owner.value) return true;
  if (busy.value) return false;
  host.value?.cancelPreparation();
  if (view.value?.completionPending || view.value?.conflict || view.value?.reviewPending)
    return false;
  return roomSource && !view.value?.dirty && !view.value?.saving ? true : await save();
}
async function signIn() {
  if (roomSource || (await save())) await reauthenticate();
}
function shouldWarn() {
  return (
    busy.value ||
    saveError.value ||
    !!(
      view.value?.dirty ||
      view.value?.saving ||
      view.value?.completionPending ||
      view.value?.reviewPending
    )
  );
}
defineExpose({ canLeave, shouldWarn, cancelPreparation: () => host.value?.cancelPreparation() });
onBeforeUnmount(() => {
  if (!roomSource) void save();
  alive = false;
  host.value?.cancelPreparation();
});
</script>

<style scoped>
.lesson-activity {
  min-width: 0;
  display: grid;
  gap: 1rem;
}
button {
  min-height: 44px;
  width: fit-content;
  padding: 0.65rem 1rem;
  margin: 0.4rem 0.5rem 0.4rem 0;
  border-radius: 0.5rem;
  background: var(--color-secondary);
  color: var(--color-heading);
}
</style>
