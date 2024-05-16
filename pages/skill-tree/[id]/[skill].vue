<template>
  <main
    class="relative h-screen-main min container-fluid grid grid-rows-[auto_auto_auto_1fr] grid-cols-1 lg:grid-cols-[300px_1fr_300px] lg:grid-rows-[auto_1fr] gap-container place-content-start lg:place-content-center place-items-center pb-container"
  >
    <Head>
      <Title>Skill Details - {{ skillName }}</Title>
    </Head>

    <SkillTreeHeader
      class="pt-card lg:col-span-3 justify-self-start h-fit"
      :absolute="false"
      no-zoom-level
      :breadcrumbs="breadcrumbs"
    />

    <SkillTreeNodeDetailsStepper
      class="h-fit"
      :subSkillID="subSkillID"
      :skillID="rootSkillID"
      :activeStepper="activeStepper"
      @activeStepper="activeStepper = $event"
    />
    <div class="h-fit pointer-events-none">
      <SkillTreeNodeSvg
        :size="nodeSize"
        :node="subSkill"
        :active="true"
        :completed="subSkill?.completed ?? false"
        class="mx-auto"
      />
      <h6
        class="text-heading-4 lg:text-heading-3 xl:text-heading-2 text-center mt-card-sm"
      >
        {{ subSkill?.name ?? "" }}
      </h6>
    </div>

    <SkillTreeNodeDetailsStepperContent
      class="h-fit"
      :activeStepper="activeStepper"
      :courses="courses"
      :coachings="coachings"
      :webinars="webinars"
      :subSkillID="subSkillID"
      :skillID="rootSkillID"
      :quizzes="quizzes"
    />
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Quiz } from "~/types/courseTypes";
import { getQuizzesInSkill, useQuizzes } from "~~/composables/quizzes";
definePageMeta({
  middleware: ["auth"],
});

export default defineComponent({
  head: {
    title: "Sub Skill Details",
  },
  setup() {
    const { t } = useI18n();

    const activeStepper = ref(0);

    const subSkillTree: Ref<any> = useSubSkillTree();

    const courses = useCourses();
    const coachings = useCoachings();
    const webinars = useWebinars();
    const quizzes = useQuizzes();
    const route = useRoute();

    const rootSkillID = computed(() => {
      return <string>(route?.params?.id ?? "");
    });

    const subTreeName = computed(() => {
      return rootSkillID.value.replace(/_/g, " ");
    });

    const subSkillID = computed(() => {
      return <string>(route?.params?.skill ?? "");
    });

    const skillName = computed(() => {
      return subSkillID.value.replace(/_/g, " ");
    });

    const subSkill = computed(() => {
      let skills: any[] = subSkillTree.value?.skills ?? [];
      return skills.find((skill) => skill.id == subSkillID.value);
    });

    const courseIDs = computed(() => {
      return subSkill.value?.courses ?? [];
    });

    const breadcrumbs = computed(() => {
      return [
        {
          label: "Headings.RootSkillTree",
          to: "/skill-tree",
        },
        {
          label: subTreeName.value,
          to: `/skill-tree/${rootSkillID.value}`,
        },
        {
          label: skillName.value,
        },
      ];
    });

    const loading = ref(true);

    const windowWidth = ref(process.client && window ? window.innerWidth : 0);

    function updateWindowWidth() {
      windowWidth.value = window?.innerWidth ?? 0;

      if (windowWidth.value >= 1440) {
        nodeSize.value = 300;
      } else if (windowWidth.value >= 1024 && windowWidth.value < 1440) {
        nodeSize.value = 250;
      } else if (windowWidth.value >= 524 && windowWidth.value < 1024) {
        nodeSize.value = 200;
      } else {
        nodeSize.value = 150;
      }
    }

    const nodeSize = ref(150);

    onMounted(async () => {
      if (window) {
        updateWindowWidth();
        window.addEventListener("resize", updateWindowWidth);
      }

      courses.value = [];

      const [success, error] = await getSubSkillTree(rootSkillID.value);

      if (!!success) {
        await Promise.all([
          getTheseCourses(courseIDs.value),
          getCoachingsForThisSubSkill(subSkillID.value),
          getWebinarsForThisSubSkill(subSkillID.value),
          getQuizzesInSkill(subSkillID.value),
        ]);
        // assignQuizzes()
      }

      loading.value = false;
    });



    onUnmounted(() => {
      if (window) {
        window.removeEventListener("resize", updateWindowWidth);
      }
    });

    return {
      t,
      activeStepper,
      loading,
      courses,
      coachings,
      webinars,
      subSkill,
      nodeSize,
      rootSkillID,
      subTreeName,
      subSkillID,
      skillName,
      breadcrumbs,
      quizzes,
    };
  },
});
</script>

<style scoped></style>
