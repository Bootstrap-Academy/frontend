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
		<div>
			{{ codeText }}
		</div>

		<pre><code>let a = 'hello world'; console.log(a);</code></pre>

		<!-- <template v-for="(category, i) of challengesCategories" :key="category.id">
			<ChallengesCategory :data="category" />
			<hr class="mt-box" v-if="i < challengesCategories.length - 1" />
		</template> -->
	</main>
</template>

<script lang="ts">
import hljs from 'highlight.js';

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
			document.addEventListener('DOMContentLoaded', (event) => {
				document
					.querySelectorAll('pre code')
					.forEach((el: any) => hljs.highlightElement(el));
			});
		});

		const codeText = computed(() => {
			return hljs.highlightAuto('<h1>Hello World!</h1>').value;
		});

		return { loading, challengesCategories, codeText };
	},
};
</script>

<style scoped></style>
