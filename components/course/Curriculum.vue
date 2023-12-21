<template>
  <div class="grid gap-card">
    <section v-for="(section, i) of sections" :key="section.id">
      <hr v-if="i > 0" class="mb-card" />

      <header class="cursor-pointer" @click="activeSection = section.id">
        <div>
          <p class="text-xs mb-1 uppercase tracking-[2px]">
            {{ t("Headings.Section", { n: " " }, 1) }} {{ i + 1 }}
          </p>
          <h3 class="text-heading-4">{{ section.title }}</h3>
        </div>

        <p
          v-if="!!section.duration"
          class="h-fit text-xs text-warning flex-shrink-0 w-fit mb-1 bg-warning-light rounded py-1 px-2"
        >
          {{ section.duration }}
        </p>

        <ChevronDownIcon
          class="w-5 h-5"
          :class="
            activeSection == section.id
              ? 'rotate-0 text-accent'
              : 'rotate-180 text-subheading'
          "
        />
      </header>

      <article
        class="grid gap-card-sm xl:gap-box pt-box"
        v-if="activeSection == section.id"
        :class="{ 'pointer-events-none': !isCourseAccessible }"
      >
        <CourseCurriculumLecture
          v-for="lecture of getLecturesOfThisSection(section.id)"
          :key="lecture.id"
          :data="lecture"
          :activeSection="activeSection"
          :activeLecture="activeLecture"
          @click="onclickWatchThisLecture(lecture.id)"
        />
      </article>

      <article
        class="pt-box"
        v-if="getLecturesOfThisSection(section.id).length <= 0"
      >
        <p class="text-sm text-subheading">
          {{ t("Error.NoLecturesAvailable") }}
        </p>
      </article>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType, Ref } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDownIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: { ChevronDownIcon },
  props: {
    isCourseAccessible: { type: Boolean, default: true },
    data: { type: Object as PropType<any>, default: null },
  },
  emits: ["watch"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const skillID = computed(() => {
      return <string>(route.query?.skillID ?? "");
    });

    const subSkillID = computed(() => {
      return <string>(route.query?.subSkillID ?? "");
    });

    const sections: Ref<any[]> = computed(() => {
      return (props.data?.sections ?? []).map((section: any, i: number) => {
        // if section has no id, then a custom id is made using title and index

        return !!!section.id && !!section.title
          ? {
            ...section,
            id: `${section.title.replace(/ /g, "_")}-${i}`,
            duration: getTotalDurationOfThisSection(section),
          }
          : { ...section, duration: getTotalDurationOfThisSection(section) };
      });
    });

    function getLecturesOfThisSection(sectionID: string): any[] {
      const thisSection = sections.value.find(
        (section) => section.id == sectionID
      );
      if (!!!thisSection) return [];

      let lectures: any[] = thisSection.lectures ?? [];
      if (!!!lectures || lectures.length <= 0) return [];

      return lectures.map((lecture, i) => {
        // if lecture has no id, then a custom id is made using title and index
        return !!!lecture.id && !!lecture.title
          ? { ...lecture, id: `${lecture.title.replace(/ /g, "_")}-${i}` }
          : { ...lecture };
      });
    }

    const router = useRouter();
    const route = useRoute();

    const activeSection = computed({
      get(): string {
        return <string>(route?.query?.section ?? "");
      },
      set(id: string) {
        if (!id) {
          router.replace({
            path: route.path,
          });
        } else if (getLecturesOfThisSection(id).length > 0) {
          router.replace({
            path: route.path,
            query: {
              section: id,
              lecture: getActiveLectureForThisSection(id),
              skillID: skillID?.value ?? "a",
              subSkillID: subSkillID?.value ?? "a",
            },
          });
        }
      },
    });

    const activeLecture = computed({
      get(): string {
        return <string>(route?.query?.lecture ?? "");
      },
      set(id: string) {
        if (!id) {
          router.replace({
            path: route.path,
          });
        } else {
          router.replace({
            path: route.path,
            query: {
              section: activeSection.value,
              lecture: id,
              skillID: skillID?.value ?? "a",
              subSkillID: subSkillID?.value ?? "a",
            },
          });
        }
      },
    });

    function getTotalDurationOfThisSection(section: any) {
      if (!!!section) return "";

      const lectures = section.lectures ?? [];
      if (!!!lectures || lectures.length <= 0) return "";

      const totalDuration = lectures.reduce(
        (previousValue: number, currentValue: any) =>
          previousValue + currentValue.duration ?? 0,
        0
      );

      const { minutes, hours } = convertTimestampToDate(totalDuration);

      let roundedHours = Math.round(hours);
      let minutesLeftInHours = hours - roundedHours;
      minutesLeftInHours = Math.round(minutesLeftInHours * 60);

      let hoursString =
        roundedHours > 0
          ? t(
            "Headings.Hours",
            { n: roundedHours },
            roundedHours
          ).toLocaleLowerCase()
          : "";
      let minsString =
        minutesLeftInHours > 0
          ? t(
            "Headings.Mins",
            { n: minutesLeftInHours },
            minutesLeftInHours
          ).toLocaleLowerCase()
          : "";

      return `${hoursString} ${
        !!hoursString && !!minsString
          ? t("Headings.And").toLocaleLowerCase()
          : ""
      } ${minsString}`;
    }

    function getActiveLectureForThisSection(sectionID: string) {
      let lectures: any[] = getLecturesOfThisSection(sectionID);
      if (!!!lectures || lectures.length <= 0) return "";

      let firstLectureID = lectures[0]?.id ?? "";
      let lastCompletedLecture = lectures
        .reverse()
        .find((lecture) => lecture.completed == true);

      return lastCompletedLecture?.id ?? firstLectureID;
    }

    function onclickWatchThisLecture(lectureID: string) {
      activeLecture.value = lectureID;

      emit("watch", {
        sectionID: activeSection.value,
        lectureID: lectureID,
      });
    }

    onMounted(() => {
      if (!!!activeSection.value || !!!activeLecture.value) {
        activeSection.value = sections.value[0]?.id ?? "";
      }
    });
    return {
      t,
      sections,
      activeSection,
      activeLecture,
      getLecturesOfThisSection,
      onclickWatchThisLecture,
      getTotalDurationOfThisSection,
    };
  },
});
</script>

<style scoped>
header {
  @apply grid grid-cols-[1fr_auto] gap-2;
  grid-template-areas:
    "duration arrow"
    "title arrow";
}
header > *:nth-child(1) {
  grid-area: title;
}
header > *:nth-child(2) {
  grid-area: duration;
}
header > *:nth-child(3) {
  grid-area: arrow;
  @apply justify-self-end;
}

@media screen and (min-width: 768px) {
  header {
    grid-template-areas:
      "title duration"
      "title arrow";
  }
}
</style>
