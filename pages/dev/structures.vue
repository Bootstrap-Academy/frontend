<template>
	<div class="grid gap-container text-white">
		<section class="container">container</section>
		<section class="container-fluid">container-fluid</section>
		<section class="container-form">container-form</section>
		<section class="card">card</section>
		<section class="card style-card bg-secondary">
			card + style-card + bg-secondary
		</section>

		<section class="card-sm px-3 lg:px-10">card-sm</section>
		<section class="card-sm style-card bg-secondary">
			card-sm + style-card + bg-secondary
		</section>

		<section class="box">box</section>
		<section class="box style-box bg-secondary">
			box + style-box + bg-secondary
		</section>

		<section class="container">
			<h2 class="text-heading-2">gap-container</h2>
			<section class="grid grid-cols-4 gap-container">
				<article
					v-for="n in 8"
					:key="n"
					class="w-full h-full bg-secondary p-10"
				></article>
			</section>

			<h2 class="text-heading-2 mt-container">gap-card</h2>
			<section class="grid grid-cols-4 gap-card">
				<article
					v-for="n in 8"
					:key="n"
					class="w-full h-full bg-secondary p-10"
				></article>
			</section>

			<h2 class="text-heading-2 mt-container">gap-card-sm</h2>
			<section class="grid grid-cols-4 gap-card-sm">
				<article
					v-for="n in 8"
					:key="n"
					class="w-full h-full bg-secondary p-10"
				></article>
			</section>

			<h2 class="text-heading-2 mt-container">gap-box</h2>
			<section class="grid grid-cols-4 gap-box">
				<article
					v-for="n in 8"
					:key="n"
					class="w-full h-full bg-secondary p-10"
				></article>
			</section>
		</section>

		<section class="container grid grid-cols-4 gap-container">
			<section>
				<h2 class="text-heading-2 clamp line-1">mb-container</h2>
				<article
					v-for="n in 3"
					:key="n"
					class="w-full h-10 bg-secondary p-1 md:p-10 mb-container"
				></article>
			</section>

			<section>
				<h2 class="text-heading-2 clamp line-1">mb-card</h2>
				<article
					v-for="n in 3"
					:key="n"
					class="w-full h-10 bg-secondary p-1 md:p-10 mb-card"
				></article>
			</section>

			<section>
				<h2 class="text-heading-2 clamp line-1">mb-card-sm</h2>
				<article
					v-for="n in 3"
					:key="n"
					class="w-full h-10 bg-secondary p-1 md:p-10 mb-card-sm"
				></article>
			</section>

			<section>
				<h2 class="text-heading-2 clamp line-1">mb-box</h2>
				<article
					v-for="n in 3"
					:key="n"
					class="w-full h-10 bg-secondary p-1 md:p-10 mb-box"
				></article>
			</section>
		</section>
	</div>
</template>

<script>
definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'Structures',
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
