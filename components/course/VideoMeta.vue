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
      <template
        v-if="
          activeLecture.completed || listOfCompletedCourses.find((lec) => lec == activeLecture.id)
        "
      >
        <Btn i-if="user?.admin || canCreate" :icon="PlusCircleIcon" secondary sm @click="addTask">{{
          t("Buttons.AddTask")
        }}</Btn>
      </template>

      <Btn sm v-else-if="!activeLecture.completed" secondary @click="markLectureAsComplete()">
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

    <SkillSelectionModal
      :show="showSkillSelection"
      :skills="possibleRootSkills"
      @close="showSkillSelection = false"
      @select="handleSkillSelection"
    />
  </header>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent, ref, computed, onMounted } from "vue";
import { CheckIcon, CheckBadgeIcon, PlusCircleIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  components: {
    CheckIcon,
    CheckBadgeIcon,
    PlusCircleIcon,
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
    const user: any = useUser();
    const { t } = useI18n();
    const showConfetti = useShowConfetti();
    const xp: any = useXP();
    const listOfCompletedCourses = useListOfCompletedCourses();
    const totalLevel = ref(0);
    const router = useRouter();
    const showSkillSelection = ref(false);
    const selectedSkillID = ref(props.skillID);
    const rootSkillTree = useRootSkillTree();

    const possibleRootSkills: any = computed(() => {
      const results: { id: string; name: string }[] = [];

      rootSkillTree.value.skills.forEach((skill: any) => {
        if (skill.skills) {
          skill.skills.forEach((subskill: any) => {
            if (subskill === "medienkompetenz") {
              results.push({ id: skill.id, name: skill.name });
            }
          });
        }
      });

      return results;
    });

    const courseID: any = computed(() => {
      return props.course?.id ?? "";
    });

    const canCreate: any = computed(() => {
      let eligible = false;
      xp?.value?.skills.forEach((skill: any) => {
        if (props.skillID == skill.skill) {
          skill.skills.forEach((subSkill: any) => {
            if (props.subSkillID == subSkill.skill && subSkill.level >= 5) {
              totalLevel.value = subSkill.level;
              eligible = true;
            }
            if (props.subSkillID == subSkill.skill && subSkill.level >= 20) {
              totalLevel.value = subSkill.level;
            }
          });
        }
      });
      return eligible;
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

    function addTask() {
      const subSkillID = props.subSkillID || courseID.value;
      let skillID = selectedSkillID.value || props.skillID;

      if (possibleRootSkills.value.length == 1) {
        skillID = possibleRootSkills.value[0].id;
      }

      if (skillID) {
        return router.push(
          `/quizzes/${skillID}/${subSkillID}/create?course=${courseID.value}&section=${activeSectionID.value}&lecture=${activeLectureID.value}&skillID=${skillID}&subSkillID=${subSkillID}&level=${totalLevel.value}`
        );
      }

      showSkillSelection.value = true;
    }

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

    function handleSkillSelection(skillID: string) {
      selectedSkillID.value = skillID;
      showSkillSelection.value = false;
      addTask();
    }

    onMounted(async () => {
      await getRootSkillTree();
      await getXP();
    });

    return {
      t,
      emit,
      path,
      listOfCompletedCourses,
      CheckIcon,
      PlusCircleIcon,
      markLectureAsComplete,
      activeLectureID,
      courseID,
      activeSectionID,
      showConfetti,
      user,
      canCreate,
      totalLevel,
      addTask,
      showSkillSelection,
      handleSkillSelection,
      possibleRootSkills,
    };
  },
});
</script>
