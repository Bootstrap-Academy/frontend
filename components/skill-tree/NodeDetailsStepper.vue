<template>
  <article class="flex flex-col gap-card w-full h-fit">
    <Btn v-for="{ level, label, bgColor, borderColor, disabled, handleSelectStepper } of steppers" full :key="level"
      :bgColor="bgColor" :borderColor="borderColor" @click="handleSelectStepper" :secondary="_activeStepper !== level" :disabled="disabled">
      {{ t(label) }}
    </Btn>
  </article>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    subSkill: { default: null },
    activeStepper: { default: 0 },
    skillID: { default: "" },
    subSkillID: { default: "" },
    courses: { type: Array, default: () => [] },
    coachings: { type: Array, default: () => [] },
    webinars: { type: Array, default: () => [] },
    quizzes: { type: Array, default: () => [] },
    matchings: { type: Array, default: () => [] },
  },
  emits: ["activeStepper"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const router = useRouter();

    const quizzes = useQuizzes();
    const matchings = useMatchings();

    let _activeStepper = ref(0);

    const steppers = computed(() => [
      {
        level: 0,
        label: "Headings.Courses",
        bgColor: "bg-accent",
        borderColor: "border-accent",
        disabled: !props.courses || props.courses.length === 0,
        handleSelectStepper: () => _activeStepper.value = 0,
      },
      {
        level: 1,
        label: "Headings.Coachings",
        bgColor: "bg-info",
        borderColor: "border-info",
        disabled: !props.coachings || props.coachings.length === 0,
        handleSelectStepper: () => _activeStepper.value = 1,
      },
      {
        level: 2,
        label: "Headings.Webinars",
        bgColor: "bg-warning",
        borderColor: "border-warning",
        disabled: !props.webinars || props.webinars.length === 0,
        handleSelectStepper: () => _activeStepper.value = 2,
      },
      {
        level: 3,
        label: "Headings.QuizQuestions",
        bgColor: "bg-error",
        borderColor: "border-error",
        disabled: !props.quizzes || props.quizzes.length === 0,
        handleSelectStepper: () => openQuiz(quizzes.value[0]?.id),
      },
      {
        level: 4,
        label: "Headings.Matchings",
        bgColor: "bg-success",
        borderColor: "border-success",
        disabled: !props.matchings || props.matchings.length === 0,
        handleSelectStepper: () => openMatchings(matchings.value[0]?.id, matchings.value[0]?.task_id),
      },
    ]);

    function openQuiz(subTaskId: string) {
      router.push(
        `/quizzes/solve-${props.subSkillID}?quizzesFrom=${"skill"}&querySubTaskId=${subTaskId}&rootSkillID=${props.skillID}&subSkillID=${props.subSkillID}`
      );
    }

    function openMatchings(subTaskId: string, taskId: string) {
      router.push(
        `/matchings/solve-${props.subSkillID}?quizzesFrom=${"skill"}&querySubTaskId=${subTaskId}&taskId=${taskId}&rootSkillID=${props.skillID}&subSkillID=${props.subSkillID}`
      );
    }

    watch(
      () => _activeStepper.value,
      (newValue) => {
        console.log("newValue", newValue);
        emit("activeStepper", newValue);
      },
      { deep: true }
    );

    return { steppers, t, _activeStepper, quizzes, matchings, openQuiz, openMatchings };
  },
});
</script>
