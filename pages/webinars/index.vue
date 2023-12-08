<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
❌ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Recaptcha
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->
<template>
	<main
		class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
	>
		<template v-if="loading">
			<CourseCardSkeleton v-for="n in 5" :key="n" />
		</template>

		<template v-else-if="myWebinars && myWebinars.length > 0">
			<CalendarEvent
				v-for="(webinar, i) of myWebinars"
				:key="i"
				:data="webinar"
			/>
		</template>

		<CourseCardEmptyState class="col-span-full" v-else />
	</main>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'My Webinars',
  },
  setup() {
    const myWebinars = useMyWebinars();

    const loading = ref(myWebinars.value.length <= 0);

    onMounted(async () => {
      await getMyWebinars();
      loading.value = false;
    });

    return { loading, myWebinars };
  },
};
</script>

<style scoped>
.grid-auto {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 425px) {
	.grid-auto {
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	}
}
</style>
