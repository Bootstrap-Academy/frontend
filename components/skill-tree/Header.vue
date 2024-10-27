<template>
  <header
    class="flex gap-card items-center justify-between flex-wrap capitalize"
    :class="{ 'absolute left-0 top-card w-screen container-fluid': absolute }"
  >
    <div class="py-2 px-4 md:py-3 md:px-6 bg-secondary style-box">
      <template v-for="(path, i) of breadcrumbs" :key="i">
        <NuxtLink v-if="path.to" :to="path.to" class="inline-block text-body-2">
          {{ t(path.label) }}
        </NuxtLink>
        <h1 v-else class="text-heading-2 capitalize inline-block">
          {{ t(path.label) }}
        </h1>

        <span v-if="i < breadcrumbs.length - 1" class="text-accent mx-3">
          /
        </span>
      </template>
    </div>

    <NuxtLink
      v-if="quizzesQuickStart && lastViewCourse && lastViewCourseInfo.existing"
      :to="`/quizzes/solve-${lastViewCourse.courseId}?quizzesFrom=course&rootSkillID=${lastViewCourse.skillID}&subSkillID=${lastViewCourse.subSkillID}`"
    >
      <Btn>
        {{ t("Headings.ViewQuizzesForLastViewCourse", {
          type: t(lastViewCourseInfo.type)
        }) }}
      </Btn>
    </NuxtLink>

    <SkillTreeZoomLevel
      v-if="!noZoomLevel"
      @zoomLevel="emit('zoomLevel', $event)"
    />
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
  emits: ["zoomLevel"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const lastViewCourse: any = useCookie("lastViewCourse");

    const lastViewCourseInfo = computed(() => {
      let quizzes = useQuizzesInCourse();
      let matchings = useMatchingsInCourse();

      return {
        existing: (
          quizzes.value.length > 0 || matchings.value.length > 0
        ),
        type: quizzes.value.length > 0 ? "Headings.Quizzes" : "Headings.Matchings", 
      }
    });

    return { emit, t, lastViewCourse, lastViewCourseInfo };
  },
});
</script>
