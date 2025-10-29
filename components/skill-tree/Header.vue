<template>
  <header
    class="pointer-events-auto z-20 flex flex-wrap items-center justify-between capitalize gap-card"
    :class="absolute ? 'container-fluid absolute left-0 w-screen top-card' : 'relative'"
  >
    <div class="bg-secondary px-4 py-2 style-box md:px-6 md:py-3">
      <template v-for="(path, i) of breadcrumbs" :key="i">
        <NuxtLink v-if="path.to" :to="path.to" class="text-body-2 inline-block">
          {{ t(path.label) }}
        </NuxtLink>
        <h1 v-else class="text-heading-2 inline-block capitalize">
          {{ t(path.label) }}
        </h1>

        <span v-if="i < breadcrumbs.length - 1" class="mx-3 text-accent"> / </span>
      </template>
    </div>

    <NuxtLink
      v-if="quizzesQuickStart && lastViewCourse && lastViewCourseInfo.existing"
      :to="`/quizzes/solve-${lastViewCourse.courseId}?quizzesFrom=course&rootSkillID=${lastViewCourse.skillID}&subSkillID=${lastViewCourse.subSkillID}`"
    >
      <Btn>
        {{
          t("Headings.ViewQuizzesForLastViewCourse", {
            type: t(lastViewCourseInfo.type),
          })
        }}
      </Btn>
    </NuxtLink>
  </header>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    breadcrumbs: { type: Array as PropType<any[]>, default: [] },
    noZoomLevel: { type: Boolean, default: false },
    absolute: { type: Boolean, default: true },
    quizzesQuickStart: { type: Boolean, default: false },
  },
  setup() {
    const { t } = useI18n();
    const lastViewCourse: any = useCookie("lastViewCourse");

    const lastViewCourseInfo = computed(() => {
      let quizzes = useQuizzesInCourse();
      let matchings = useMatchingsInCourse();

      return {
        existing: quizzes.value.length > 0 || matchings.value.length > 0,
        type: quizzes.value.length > 0 ? "Headings.Quizzes" : "Headings.Matchings",
      };
    });

    return { t, lastViewCourse, lastViewCourseInfo };
  },
});
</script>
