<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->
<template>
	<main
		class="markdown grid grid-cols-1 gap-card container h-screen-inner min pb-container pt-container"
	>
		<MarkdownEditor class="mb-container" />
		<div
			v-html="
				$md.render(
					'Hello, **world!** $$sum_{k=1}^{n}k=\\frac{n(n+1)}{2}$$ \n - hello'
				)
			"
		></div>
		<div
			v-html="
				$md.render(`\`\`\`JAVASCRIPT
let a = 'hello world';
console.log(a);
\`\`\``)
			"
		></div>

		<div
			v-html="
				$md.render(
					`This is a KaTeX expression: $\\int_{0}^{\\infty} x^{2} e^{-x} dx$.`
				)
			"
		></div>

		<div
			v-html="
				$md.render(
					`This is a KaTeX expression: $$\\int_{0}^{\\infty} x^{2} e^{-x} dx$$.`
				)
			"
		></div>

		<div
			v-html="
				$md.render(
					'This is a KaTeX expression: $$\\int_{0}^{\\infty} x^{2} e^{-x} dx$$.'
				)
			"
		></div>

		<div v-html="$md.render('$$\\int_{0}^{\\infty} x^{2} e^{-x} dx$$')"></div>
		<div v-html="$md.render('\\int_{0}^{\\infty} x^{2} e^{-x} dx')"></div>
		<div v-html="$md.render('$$sum_{k=1}^{n}k=\\frac{n(n+1)}{2}$$')"></div>

		<div
			v-html="
				$md.render(`This is a KaTeX expression:
				\\int_{0}^{\\infty} x^{2} e^{-x} dx

    And this is a code block with syntax highlighting:

    \`\`\`javascript
    function helloWorld() {
      console.log('Hello, World!');
    }
    helloWorld();
    \`\`\`
  `)
			"
		></div>
		<!-- <template v-for="(category, i) of challengesCategories" :key="category.id">
			<ChallengesCategory :data="category" />
			<hr class="mt-box" v-if="i < challengesCategories.length - 1" />
		</template> -->
	</main>
</template>

<script lang="ts">
definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'All Challenges',
	},
	setup() {
		const challengesCategories = useChallengesCategories();
		const loading = ref(challengesCategories.value.length <= 0);

		onMounted(async () => {
			await getChallengesCategories();
			loading.value = false;
		});

		return { loading, challengesCategories };
	},
};
</script>

<style scoped></style>
