<template>
	<div class="w-full px-1">
		<QuizCard v-for="(quiz, i) of quizzes" :key="i" :data="quiz" class="my-3" />
	</div>
</template>

<script lang="ts" setup>
import type { Quiz } from "~/types/courseTypes";

const props = defineProps<{
    quizzes: Quiz[];
  }>()
</script>

<style scoped></style>
