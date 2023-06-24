<template>
  <header class="flex gap-card justify-between flex-wrap md:flex-nowrap">
    <div class="flex flex-wrap">
      <NuxtLink :to="path">{{ course?.title ?? "" }} /</NuxtLink>

      <h1 class="text-heading-2 capitalize mr-6">
        {{ activeLecture?.title ?? "" }}
      </h1>
    </div>

    <div class="flex gap-box flex-wrap h-fit flex-shrink-0 mt-0.5">
      <template
        v-if="
          activeLecture.completed ||
          listOfCompletedCourses.find((lec) => lec == activeLecture.id)
        "
      >
        <Chip @click="dd()" :icon="CheckIcon" color="bg-info">
          {{ t("Headings.Completed") }}
        </Chip>
        <NuxtLink
          :to="`/quizzes/${'web_developer'}/${'angular'}/create?course=${courseID}&section=${activeSectionID}&lecture=${activeLectureID}`"
        >
          <Btn sm>{{ t("Buttons.AddQuizQuestion") }}</Btn>
        </NuxtLink>
      </template>
      <Btn
        sm
        v-else-if="!activeLecture.completed"
        secondary
        @click="markLectureAsComplete()"
      >
        {{ t("Buttons.MarkCompleted") }}
      </Btn>
    </div>

    <article class="flex midXl:hidden gap-card items-center h-fit">
      <div
        class="block midXl:hidden bg-tertiary py-1 px-2 rounded-lg h-fit w-fit cursor-pointer"
        @click="emit('update:modelValue', !modelValue)"
      >
        <p class="text-accent text-body-2 justify-self-end">Content</p>
      </div>
      <div class="flex gap-2">
        <ArrowLeftCircleIcon
          @click="goToPrevLecture"
          class="w-10 h-10 text-accent cursor-pointer"
        />
        <ArrowRightCircleIcon
          @click="goToNextLecture"
          class="w-10 h-10 text-accent cursor-pointer"
        />
      </div>
    </article>

    <!-- pr-[70px] -->
    <article class="hidden midXl:flex gap-box items-center h-fit w-fit">
      <Btn sm tertiary @click="goToPrevLecture" :icon="ArrowLeftIcon">
        {{ t("Buttons.Prev") }}
      </Btn>

      <Btn sm @click="goToNextLecture" :icon="ArrowRightIcon" icon-right>
        {{ t("Buttons.Next") }}
      </Btn>
    </article>
  </header>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent, PropType, Ref } from "vue";
import {
  CheckIcon,
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/vue/24/solid";

export default defineComponent({
  components: {
    CheckIcon,
    ArrowLeftCircleIcon,
    ArrowRightCircleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
  },
  props: {
    course: { type: Object as PropType<any>, default: null },
    activeSection: { type: Object as PropType<any>, default: null },
    activeLecture: { type: Object as PropType<any>, default: null },
    modelValue: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const showConfetti = useShowConfetti();

    const courseID = computed(() => {
      return props.course?.id ?? "";
    });

    const activeSectionID = computed(() => {
      return props.activeSection?.id ?? "";
    });

    const activeLectureID = computed(() => {
      return props.activeLecture?.id ?? "";
    });

    const lectures: Ref<any[]> = computed(() => {
      const sections: any[] = props.course?.sections ?? [];
      if (!!!sections || sections.length <= 0) return [];

      let arr: any = [];

      sections.forEach((section) => {
        let lectures: any[] = section?.lectures ?? [];

        // mapping section id in each lecture
        lectures = lectures.map((lec) => {
          return { ...lec, sectionID: section.id };
        });

        arr = [...arr, ...lectures];
      });

      return arr;
    });

    const path = computed(() => {
      if (!!!courseID.value) {
        return "/profile/courses";
      } else if (!!!activeSectionID.value || !!!activeLectureID.value) {
        return `/courses/${courseID.value}`;
      } else {
        return `/courses/${courseID.value}?section=${activeSectionID.value}&lecture=${activeLectureID.value}`;
      }
    });

    const listOfCompletedCourses = useListOfCompletedCourses();

    async function markLectureAsComplete() {
      setLoading(true);
      const [success, error] = await completeLecture(
        courseID.value,
        activeLectureID.value
      );
      setLoading(false);

      if (success) {
        const hideAnimation: any = useCookie("hideAnimationNextTime");
        console.log("hide animation cookie", hideAnimation.value);
        if (hideAnimation.value === undefined || hideAnimation.value == false)
          showConfetti.value = true;
        listOfCompletedCourses.value.push(activeLectureID.value);
      }
    }

    const router = useRouter();
    const route = useRoute();

    async function goToPrevLecture() {
      if (lectures.value.length <= 0) return;

      let indexOfCurrentLecture = lectures.value.findIndex(
        (lec) => lec.id == activeLectureID.value
      );

      // current lecture is first lecture
      if (indexOfCurrentLecture <= 0) {
        openSnackbar("warning", "Body.ThisIsFirstLecture");
        return;
      }
      // current lecture was not found
      else if (indexOfCurrentLecture < 0) {
        // handle error
        return;
      }

      // current lecture is somewhere in middle
      let preLecture = lectures.value[indexOfCurrentLecture - 1];
      if (!!!preLecture || !!!preLecture.id || !!!preLecture.sectionID) {
        // handle error
        return;
      }

      router.replace({
        path: route.path,
        query: {
          section: preLecture.sectionID ?? "",
          lecture: preLecture.id ?? "",
        },
      });
    }

    async function goToNextLecture() {
      if (lectures.value.length <= 0) return;

      let indexOfCurrentLecture = lectures.value.findIndex(
        (lec) => lec.id == activeLectureID.value
      );

      // current lecture is last lecture
      if (indexOfCurrentLecture >= lectures.value.length - 1) {
        openDialog(
          "success",
          "Headings.CourseCompleted",
          "Body.CourseCompleted",
          false,
          {
            label: "Buttons.ViewMoreCourses",
            onclick: () => {
              router.push(`/profile/courses`);
            },
          },
          {
            label: "Buttons.Okay",
            onclick: () => {},
          }
        );
        return;
      }
      // current lecture was not found
      else if (indexOfCurrentLecture < 0) {
        // handle error
        return;
      }

      // current lecture is somewhere in middle
      let nextLecture = lectures.value[indexOfCurrentLecture + 1];
      if (!!!nextLecture || !!!nextLecture.id || !!!nextLecture.sectionID) {
        // handle error
        return;
      }

      router.replace({
        path: route.path,
        query: {
          section: nextLecture.sectionID ?? "",
          lecture: nextLecture.id ?? "",
        },
      });
    }

    function dd() {
      const hideAnimation: any = useCookie("hideAnimationNextTime");
      console.log("hide animation cookie", hideAnimation.value);
      if (hideAnimation.value === undefined || hideAnimation.value == false)
        showConfetti.value = true;
    }

    return {
      t,
      emit,
      path,
      listOfCompletedCourses,
      CheckIcon,
      markLectureAsComplete,
      goToPrevLecture,
      goToNextLecture,
      ArrowLeftIcon,
      ArrowRightIcon,
      activeLectureID,
      courseID,
      activeSectionID,
      showConfetti,
      dd,
    };
  },
});
</script>

<style scoped></style>
