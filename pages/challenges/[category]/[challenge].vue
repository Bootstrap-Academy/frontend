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
		class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
	></main>
</template>

<script lang="ts">
definePageMeta({
	layout: 'inner',
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Solve Challenge',
	},
	setup() {
		return {};
	},
};
</script>

<style scoped></style>
