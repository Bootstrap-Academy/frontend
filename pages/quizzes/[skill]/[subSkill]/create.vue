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
			<FormQuiz />
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
		return {};
	},
};
</script>

<style scoped></style>
