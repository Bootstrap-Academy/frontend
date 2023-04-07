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
		<template v-for="(category, i) of challengesCategories" :key="category.id">
			<ChallengesCategory :data="category" />
			<hr class="mt-box" v-if="i < challengesCategories.length - 1" />
		</template>
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
