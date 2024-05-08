<template>
  <article class="flex flex-col gap-card w-full h-fit">
    <div v-for="{ level, label, bgColor, borderColor } of steppers">
      <Btn full v-if="level == 3" :key="3" @click="openQuiz(
        quizzes[0].id,
      )" :secondary="_activeStepper != level" :bgColor="bgColor" :borderColor="borderColor">
        {{ t(label) }}
      </Btn>
      <Btn full v-else-if="level == 4" :key="5" @click="openMatchings(
          matchings[0].id,
          matchings[0].task_id,
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
    skillID: { default: "" },
    subSkillID: { default: "" },
  },
  emits: ["activeStepper"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const router = useRouter();

    const quizzes = useQuizzes();
    const matchings = useMatchings();

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

    const _activeStepper = ref(props.activeStepper ?? 0);

    watch(
      () => _activeStepper.value,
      (newValue, oldValue) => {
        emit("activeStepper", newValue);
      },
      { deep: true }
    );

    return { steppers, t, _activeStepper, quizzes, matchings, openQuiz, openMatchings };
  },
});
</script>

<style scoped></style>
