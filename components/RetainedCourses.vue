<script setup lang="ts">
import { onScopeDispose, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createRetainedCourses } from "../composables/retainedCourses";
import type { LearningCourseOperation } from "../composables/learningAccess";

const props = defineProps<{
  identity: string;
  request: (operation: LearningCourseOperation) => Promise<unknown>;
}>();
const { t } = useI18n();
const client = createRetainedCourses({
  request: (operation) => props.request(operation),
  identity: () => props.identity,
  apiBase: useRuntimeConfig().public.BASE_API_URL,
});
watch(() => props.identity, client.clear, { flush: "sync" });
onScopeDispose(client.dispose);
async function act(action: () => Promise<void>) {
  if (client.busy.value) return;
  try {
    await action();
  } catch {
    /* The adapter exposes the current failure only. */
  }
}
function mediaUnavailable() {
  client.clearMedia();
  client.error.value = "MediaUnavailable";
}
</script>

<template>
  <section
    class="grid gap-4 border-t pt-4 text-body"
    aria-labelledby="retained-courses-title"
    :aria-busy="client.busy.value"
  >
    <h4 id="retained-courses-title">{{ t("RetainedCourses.Title") }}</h4>
    <p>{{ t("RetainedCourses.Scope") }}</p>
    <button type="button" :disabled="client.busy.value" @click="act(client.load)">
      {{ t("RetainedCourses.List") }}
    </button>
    <p v-if="client.loaded.value && !client.courses.value.length" role="status">
      {{ t("RetainedCourses.Empty") }}
    </p>
    <ul v-if="client.courses.value.length" class="grid gap-2">
      <li v-for="course in client.courses.value" :key="course.id">
        <button
          type="button"
          :disabled="client.busy.value"
          :aria-pressed="client.course.value?.id === course.id"
          @click="act(() => client.openCourse(course.id))"
        >
          {{ course.title }}
        </button>
      </li>
    </ul>
    <article v-if="client.course.value" class="grid gap-4" aria-labelledby="retained-course-title">
      <h5 id="retained-course-title">{{ client.course.value.title }}</h5>
      <p v-if="client.course.value.description !== null" class="whitespace-pre-wrap">
        {{ client.course.value.description }}
      </p>
      <section v-for="section in client.course.value.sections" :key="section.id" class="grid gap-2">
        <h6>{{ section.title }}</h6>
        <ul class="grid gap-2">
          <li v-for="lecture in section.lectures" :key="lecture.id">
            <button
              type="button"
              :disabled="client.busy.value"
              :aria-pressed="client.selected.value?.lecture === lecture.id"
              @click="act(() => client.openLecture(section.id, lecture.id))"
            >
              {{ lecture.title
              }}<span v-if="lecture.completed"> — {{ t("RetainedCourses.Completed") }}</span>
            </button>
          </li>
        </ul>
      </section>
    </article>
    <article
      v-if="client.lecture.value"
      class="grid gap-3"
      aria-labelledby="retained-lecture-title"
    >
      <h5 id="retained-lecture-title">{{ client.lecture.value.title }}</h5>
      <p v-if="client.lecture.value.description" class="whitespace-pre-wrap">
        {{ client.lecture.value.description }}
      </p>
      <template v-if="client.lecture.value.type === 'youtube' && !client.youtubeLoaded.value">
        <p>
          {{ t("RetainedCourses.YouTubePrivacy") }}
          <NuxtLink to="/docs/privacy">{{ t("Links.PrivacyNoticeLinkText") }}</NuxtLink>
        </p>
        <button
          type="button"
          :disabled="client.busy.value"
          @click="
            act(() =>
              client.openLecture(
                client.selected.value!.section,
                client.selected.value!.lecture,
                true
              )
            )
          "
        >
          {{ t("Buttons.LoadVideo") }}
        </button>
      </template>
      <RetainedCoursePlayer
        v-if="client.media.value"
        :source="client.media.value"
        :type="client.lecture.value.type"
        :title="client.lecture.value.title"
        @unavailable="mediaUnavailable"
      />
      <button
        v-if="!client.media.value && client.lecture.value.type === 'mp4'"
        type="button"
        :disabled="client.busy.value"
        @click="
          act(() =>
            client.openLecture(client.selected.value!.section, client.selected.value!.lecture)
          )
        "
      >
        {{ t("RetainedCourses.ReloadMedia") }}
      </button>
      <p v-if="client.lecture.value.completed" role="status">
        {{ t("RetainedCourses.Completed") }}
      </p>
      <button
        v-else
        type="button"
        :disabled="client.busy.value || client.progressUncertain.value"
        @click="act(client.complete)"
      >
        {{ t("RetainedCourses.Complete") }}
      </button>
    </article>
    <p v-if="client.progressUncertain.value" role="status">
      {{ t("RetainedCourses.ProgressUncertain") }}
    </p>
    <button
      v-if="client.selected.value"
      type="button"
      :disabled="client.busy.value"
      @click="act(client.refreshProgress)"
    >
      {{ t("RetainedCourses.RefreshProgress") }}
    </button>
    <p v-if="client.error.value" role="alert">{{ t(`RetainedCourses.${client.error.value}`) }}</p>
  </section>
</template>

<style scoped>
button {
  color: inherit;
  border: 1px solid currentColor;
  border-radius: 0.3rem;
  padding: 0.65rem;
  text-align: left;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 3px;
}
</style>
