<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation

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
		class="relative container-fluid mt-main mb-main grid grid-cols-1fr xl:grid-cols-[1fr_300px] gap-container"
	>
		<Calendar
			class="xl:sticky xl:top-container xl:self-start"
			:events="events"
			@selected="setSelected($event)"
		/>
		<CalendarAside
			class="xl:sticky xl:top-container xl:self-start"
			:calendarICS="ics"
			:events="events"
			:selected="selected"
		/>
	</main>
</template>

<script>
import Calendar from '~~/components/calendar/index.vue';

definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Calendar',
	},
	components: { Calendar },
	setup() {
		const loading = ref(true);
		const ics = useICS();
		const events = useEvents();

		const selected = reactive({
			date: null,
			month: null,
			year: null,
		});

		onMounted(async () => {
			await getCalendar();
			loading.value = false;
		});

		function setSelected(sel) {
			Object.assign(selected, { ...sel });
		}
		return { ics, loading, events, setSelected, selected };
	},
};
</script>
