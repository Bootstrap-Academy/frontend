<template>
  <div class="w-full px-1">
    <QuizCard v-for="(task, i) of tasks" :key="i" :data="task" class="my-3" />
  </div>
</template>

<script lang="ts">
import { getSubTasksInQuiz } from "~~/composables/quizzes";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    quizId: { type: String, default: "" },
  },
  setup(props) {
    const tasks: any = ref([]);
    onMounted(async () => {
      const [success, error] = await getSubTasksInQuiz(props?.quizId);
      if (success) tasks.value = success ?? [];
    });
    watch(
      () => props.quizId,
      async () => {
        const [success, error] = await getSubTasksInQuiz(props?.quizId);
        if (success) tasks.value = success ?? [];
      }
    );
    return {
      // subTasksInQuiz,
      tasks,
    };
  },
});
</script>

<style scoped></style>
