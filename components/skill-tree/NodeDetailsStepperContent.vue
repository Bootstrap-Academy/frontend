<template>
  <section class="flex h-fit max-h-[70vh] w-full items-center justify-between">
    <div
      class="content-container"
      v-if="activeStepper == 0"
      :class="{ 'hide-scrollbar': !!!courses || courses.length <= 0 }"
    >
      <template v-if="courses && courses.length > 0">
        <NuxtLink
          class="content"
          v-for="(course, i) of courses"
          :key="i"
          @click="saveLastVisitedCourse(course?.id)"
          :to="`/courses/${course.id}?skillID=${skillID}&subSkillID=${subSkillID}`"
        >
          <CourseCard :data="course" />
        </NuxtLink>
      </template>

      <h3 v-else class="text-heading-3 text-center">
        {{ t("Headings.CoursesComingSoon") }}
      </h3>
    </div>

    <div
      class="content-container"
      v-else-if="activeStepper == 1"
      :class="{ 'hide-scrollbar': !!!coachings || coachings.length <= 1 }"
    >
      <template v-if="coachings && coachings.length > 0">
        <CalendarEvent
          class="content full"
          v-for="(coaching, i) of coachings"
          :key="i"
          full
          :data="coaching"
          :subSkillID="subSkillID"
        />
      </template>
      <h3 v-else class="text-heading-3 text-center">
        {{ t("Headings.CoachingComingSoon") }}
      </h3>
    </div>

    <div
      class="content-container"
      v-else-if="activeStepper == 2"
      :class="{ 'hide-scrollbar': !!!webinars || webinars.length <= 1 }"
    >
      <template v-if="webinars && webinars.length > 0">
        <CalendarEvent
          class="content"
          v-for="(webinar, i) of webinars"
          :key="i"
          full
          :data="webinar"
          :subSkillID="subSkillID"
        />
      </template>
      <h3 v-else class="text-heading-3 text-center">
        {{ t("Headings.WebinarsComingSoon") }}
      </h3>
    </div>

    <article class="w-full" v-else-if="activeStepper == 3">
      <div class="content-container flex flex-col items-center p-2 mt-card">
        <template v-if="quizzes && quizzes.length > 0">
          <div class="content">
            <QuizList :quizzes="quizzes" />
          </div>
        </template>
        <h3 v-else class="text-heading-3 text-center">
          {{ t("Headings.NoQuizQuestion") }}
        </h3>
      </div>
    </article>

    <article class="w-full" v-else-if="activeStepper == 4">
      <div class="content-container flex flex-col items-center p-2 mt-card">
        <template v-if="quizzes && quizzes.length > 0">
          <div class="content">
            <MatchingList v-for="(quiz, i) of quizzes" :key="i" :quizId="quiz?.id" />
          </div>
        </template>
        <h3 v-else class="text-heading-3 text-center">
          {{ t("Headings.NoMatchings") }}
        </h3>
      </div>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    skillID: { default: "" },
    subSkillID: { default: "" },
    activeStepper: { default: 0 },
    courses: { type: Array as PropType<any[]>, default: [] },
    coachings: { type: Array as PropType<any[]>, default: [] },
    webinars: { type: Array as PropType<any[]>, default: [] },
    quizzes: { type: Array as PropType<any[]>, default: [] },
  },
  emits: [],
  setup(props, { emit }) {
    const { t } = useI18n();
    function saveLastVisitedCourse(courseId: any) {
      const lastViewCourse: any = useAppCookie("lastViewCourse");
      lastViewCourse.value = {
        courseId: courseId,
        skillID: props.skillID,
        subSkillID: props.subSkillID,
      };
    }

    return { t, saveLastVisitedCourse };
  },
});
</script>

<style scoped>
.content-container {
  @apply flex max-h-[70vh] w-full max-w-full snap-x snap-mandatory overflow-x-scroll gap-card lg:snap-y lg:flex-col lg:overflow-x-auto lg:overflow-y-scroll;
}
.content {
  @apply block w-fit max-w-[300px] flex-shrink-0 snap-center lg:w-full;
}
.content.full {
  @apply w-full;
}
</style>
