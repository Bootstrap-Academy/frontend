<template>
  <section>
    <article class="flex midXl:hidden gap-card items-center">
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
    <article class="hidden midXl:flex gap-box items-center">
      <Btn sm tertiary @click="goToPrevLecture" :icon="ArrowLeftIcon">
        {{ t("Buttons.Prev") }}
      </Btn>
      <Btn sm @click="goToNextLecture" :icon="ArrowRightIcon" icon-right>
        {{ t("Buttons.Next") }}
      </Btn>
    </article>
  </section>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import type { PropType, Ref } from "vue";
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/vue/24/solid";

const props = defineProps({
  course: { type: Object as PropType<any>, default: null },
  activeLecture: { type: Object as PropType<any>, default: null },
  skillID: { type: String, default: null },
  subSkillID: { type: String, default: null },
});
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

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
      skillID: props?.skillID ?? "",
      subSkillID: props?.subSkillID ?? "",
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
      skillID: props?.skillID ?? "",
      subSkillID: props?.subSkillID ?? "",
    },
  });
}
onMounted(async () => {
  await getXP();
});
</script>

<style scoped></style>
