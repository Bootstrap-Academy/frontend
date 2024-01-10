<template>
	<section
		class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
	>
		<section class="container-form max-w-3xl">
			<SectionTitle
				center
				heading="Headings.CreateQuiz"
				size="sm"
				class="mb-card mx-auto"
			/>
			<FormQuiz :data="quiz" />
		</section>
	</section>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Create Quiz',
  },
  setup() {
    const route = useRoute();

    const quizID = computed(() => {
      return (route.params?.id ?? '').toString();
    });

    const quiz = useQuiz();

    const loading = ref(true);

    onMounted(async () => {
      loading.value = true;
      await getQuiz(quizID.value);
      loading.value = false;
    });
    return { quiz };
  },
};
</script>

<style scoped></style>
