<template>
	<aside class="grid gap-container h-fit">
		<CalendarEventTypes :calendarICS="calendarICS" />

		<article class="grid gap-card-sm xl:gap-box">
			<h2 class="text-heading-2">{{ t('Headings.UpcomingEvents') }}</h2>

			<CalendarEvent
				v-for="(event, i) of events"
				:key="i"
				hide-actions
				:data="event"
			/>
		</article>
	</aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		calendarICS: { default: '' },
		events: { default: [] },
		selected: {
			default: {
				date: null,
				month: null,
				year: null,
			},
		},
	},
	setup(props) {
		const { t } = useI18n();

		const events = computed(() => {
			return props.events.filter((event: any) => {
				let dates = convertTimestampToDate(event.start);

				return (
					dates.date == props.selected.date &&
					dates.month.number == props.selected.month &&
					dates.year == props.selected.year
					// && event.booked == true
				);
			});
		});

		return { t, events };
	},
});
</script>

<style scoped></style>
