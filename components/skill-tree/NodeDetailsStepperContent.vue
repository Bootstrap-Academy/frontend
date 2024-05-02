<template>
  <section class="max-h-[70vh] h-fit w-full flex justify-between items-center">
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

      <h3 v-else class="text-center text-heading-3">
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
      <h3 v-else class="text-center text-heading-3">
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
      <h3 v-else class="text-center text-heading-3">
        {{ t("Headings.WebinarsComingSoon") }}
      </h3>
    </div>

    <article class="w-full" v-else-if="activeStepper == 3">
      <div class="flex p-2 content-container flex-col items-center mt-card">
        <template v-if="quizzes && quizzes.length > 0">
          <div class="content">
            <QuizList :quizzes="quizzes" />
          </div>
        </template>
        <h3 v-else class="text-center text-heading-3">
          {{ t("Headings.NoQuizQuestion") }}
        </h3>
      </div>
    </article>

    <article class="w-full" v-else-if="activeStepper == 4">
      <div class="flex p-2 content-container flex-col items-center mt-card">
        <template v-if="quizzes && quizzes.length > 0">
          <div class="content">
            <MatchingList
              v-for="(quiz, i) of quizzes"
              :key="i"
              :quizId="quiz?.id"
            />
          </div>
        </template>
        <h3 v-else class="text-center text-heading-3">
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
      const lastViewCourse: any = useCookie("lastViewCourse");
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
  @apply flex lg:flex-col gap-card w-full max-w-full max-h-[70vh] overflow-x-scroll lg:overflow-x-auto snap-x lg:overflow-y-scroll lg:snap-y snap-mandatory;
}
.content {
  @apply flex-shrink-0 snap-center block w-fit lg:w-full max-w-[300px];
}
.content.full {
  @apply w-full;
}
</style>
