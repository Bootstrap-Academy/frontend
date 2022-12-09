<template>
	<aside class="grid gap-container h-fit">
		<CalendarFeatures />

		<article class="grid gap-card-sm xl:gap-box">
			<h2 class="text-heading-2">{{ t('Headings.UpcomingEvents') }}</h2>

			<CalendarEvent
				v-for="(event, i) of events"
				:key="i"
				no-booking
				:data="event"
			/>
		</article>
	</aside>
</template>

<script lang="ts">
import { defineComponent, Ref } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
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

		const eventFilter = useEventFilter();
		const user: Ref<any> = useUser();

		const events = computed(() => {
			return props.events
				.filter((event: any) => {
					let dates = convertTimestampToDate(event.start);

					return (
						dates.date == props.selected.date &&
						dates.month.number == props.selected.month &&
						dates.year == props.selected.year
					);
				})
				.filter((event: any) => {
					if (eventFilter.value == 'booked') {
						return event.booked == true;
					} else if (eventFilter.value == 'mine') {
						return (event?.instructor?.id ?? '-') == (user.value?.id ?? '');
					} else {
						return true;
					}
				});
		});

		return { t, events };
	},
});
</script>

<style scoped></style>
