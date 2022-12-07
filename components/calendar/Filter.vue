<template>
	<div class="card-sm style-card bg-secondary grid gap-card-sm xl:gap-box">
		<h2 class="text-heading-2">{{ t('Headings.FilterBy') }}</h2>

		<InputRadioGroup
			sm
			name="eventFilter"
			v-model="eventFilter"
			:options="eventFilterOptions"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	setup() {
		const { t } = useI18n();

		const eventFilter = useEventFilter();

		const eventFilterOptions = reactive([
			{
				label: 'List.Filter.All',
				value: 'all',
			},
			{
				label: 'List.Filter.Booked',
				value: 'booked',
				tooltip: 'Body.BookedEventsFilterToolTip',
			},
			{
				label: 'List.Filter.Mine',
				value: 'mine',
				tooltip: 'Body.MyEventsFilterToolTip',
			},
		]);

		return { t, eventFilterOptions, eventFilter };
	},
});
</script>

<style scoped></style>
