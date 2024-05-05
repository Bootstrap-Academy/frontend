<template>
  <article class="flex flex-col gap-card w-full h-fit">
    <div v-for="{ level, label, bgColor, borderColor } of steppers">
      <Btn full v-if="level == 3" :key="3" @click="openQuiz(
        subSkillID,
        quizzes[0].id,
        skillID
      )" :secondary="_activeStepper != level" :bgColor="bgColor" :borderColor="borderColor">
        {{ t(label) }}
      </Btn>
      <Btn full v-else :key="level" @click="_activeStepper = level" :secondary="_activeStepper != level"
        :bgColor="bgColor" :borderColor="borderColor">
        {{ t(label) }}
      </Btn>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    subSkill: { default: null },
    activeStepper: { default: 0 },
    quizzes: { type: Array as PropType<any[]>, default: [] },
    skillID: { default: "" },
    subSkillID: { default: "" },
  },
  emits: ["activeStepper"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const router = useRouter();

    const steppers = reactive([
      {
        level: 0,
        label: "Headings.Courses",
        bgColor: "bg-accent",
        borderColor: "border-accent",
      },
      {
        level: 1,
        label: "Headings.Coachings",
        bgColor: "bg-info",
        borderColor: "border-info",
      },
      {
        level: 2,
        label: "Headings.Webinars",
        bgColor: "bg-warning",
        borderColor: "border-warning",
      },
      {
        level: 3,
        label: "Headings.QuizQuestions",
        bgColor: "bg-error",
        borderColor: "border-error",
      },
      {
        level: 4,
        label: "Headings.Matchings",
        bgColor: "bg-success",
        borderColor: "border-success",
      },
    ]);

    function openQuiz(subSkillID: string, subTaskId: string, rootSkillID: string) {
      router.push(
        `/quizzes/solve-${subSkillID}?quizzesFrom=${"skill"}&querySubTaskId=${subTaskId}&rootSkillID=${rootSkillID}&subSkillID=${subSkillID}`
      );
    }

    const _activeStepper = ref(props.activeStepper ?? 0);

    watch(
      () => _activeStepper.value,
      (newValue, oldValue) => {
        emit("activeStepper", newValue);
      },
      { deep: true }
    );

    return { steppers, t, _activeStepper, openQuiz };
  },
});
</script>

<style scoped></style>
