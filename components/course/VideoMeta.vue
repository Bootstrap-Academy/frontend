<template>
  <header class="flex flex-wrap items-center justify-between gap-card md:flex-nowrap">
    <div class="flex flex-wrap items-center">
      <NuxtLink :to="path" class="flex">
        <span class="clamp max-w-max"> {{ course?.title ?? "" }} </span>
        <span>/</span>
      </NuxtLink>

      <h1 class="text-heading-2 ml-2 mr-6 capitalize">
        {{ activeLecture?.title ?? "" }}
      </h1>
      <Tooltip :heading="'Headings.Completed'" :content="''" :placement="'right'">
        <CheckBadgeIcon
          v-if="
            activeLecture.completed || listOfCompletedCourses.find((lec) => lec == activeLecture.id)
          "
          class="h-10 w-10 text-accent"
        />
      </Tooltip>
    </div>

    <div class="mt-0.5 flex h-fit flex-shrink-0 flex-wrap gap-box">
      <Btn
        sm
        v-if="!activeLecture.completed && !listOfCompletedCourses.includes(activeLecture.id)"
        secondary
        @click="markLectureAsComplete()"
      >
        {{ t("Buttons.MarkCompleted") }}
      </Btn>
    </div>

    <div
      class="block h-fit w-fit cursor-pointer rounded-lg bg-tertiary px-2 py-1 midXl:hidden"
      @click="emit('update:modelValue', !modelValue)"
    >
      <p class="text-body-2 justify-self-end text-accent">Content</p>
    </div>

    <CourseVideoControls
      class="block midXl:hidden"
      :skillID="skillID"
      :subSkillID="subSkillID"
      :course="course"
      :activeLecture="activeLecture"
      v-if="!!activeSection && !!activeLecture"
    />
  </header>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent, computed } from "vue";
import { CheckIcon, CheckBadgeIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  components: {
    CheckIcon,
    CheckBadgeIcon,
  },
  props: {
    course: { type: Object as PropType<any>, default: null },
    activeSection: { type: Object as PropType<any>, default: null },
    activeLecture: { type: Object as PropType<any>, default: null },
    modelValue: { type: Boolean, default: true },
    skillID: { type: String, default: null },
    subSkillID: { type: String, default: null },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const showConfetti = useShowConfetti();
    const listOfCompletedCourses = useListOfCompletedCourses();
    const courseID: any = computed(() => {
      return props.course?.id ?? "";
    });

    const activeSectionID = computed(() => {
      return props.activeSection?.id ?? "";
    });

    const activeLectureID = computed(() => {
      return props.activeLecture?.id ?? "";
    });

    const path: any = computed(() => {
      if (!!!courseID.value) {
        return "/profile/courses";
      } else if (!!!activeSectionID.value || !!!activeLectureID.value) {
        return `/courses/${courseID.value}?skillID=${props.skillID}&subSkillID=${props.subSkillID}`;
      } else {
        return `/courses/${courseID.value}?section=${activeSectionID.value}&lecture=${activeLectureID.value}&skillID=${props.skillID}&subSkillID=${props.subSkillID}`;
      }
    });

    async function markLectureAsComplete() {
      setLoading(true);
      const [success, error] = await completeLecture(courseID.value, activeLectureID.value);
      setLoading(false);

      if (success) {
        const hideAnimation: any = useAppCookie("hideAnimationNextTime");
        console.log("hide animation cookie", hideAnimation.value);
        if (hideAnimation.value === undefined || hideAnimation.value == false)
          showConfetti.value = true;
        listOfCompletedCourses.value.push(activeLectureID.value);
      }
    }

    return {
      t,
      emit,
      path,
      listOfCompletedCourses,
      CheckIcon,
      markLectureAsComplete,
      activeLectureID,
      courseID,
      activeSectionID,
      showConfetti,
    };
  },
});
</script>
