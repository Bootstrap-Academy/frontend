<template>
	<div class="card-sm style-card bg-secondary grid gap-card-sm xl:gap-box">
		<h2 class="text-heading-2">{{ t('Headings.EventTypes') }}</h2>

		<article
			v-for="type of types"
			:key="type.label"
			class="py-3 px-4 rounded shadow-lg flex gap-3 items-center"
			:class="type.bgLight"
		>
			<span
				class="h-2 w-2 md:h-3 md:w-3 rounded-xl flex-shrink-0 block"
				:class="type.bg"
			></span>
			<h3 class="text-heading-5 capitalize" :class="type.text">
				{{ t(type.label) }}
			</h3>
		</article>

		<a :href="ics" download type="text/calendar">
			<Btn full class="mt-box">{{ t('Buttons.LinkCalendar') }}</Btn>
		</a>

		<h2 class="text-heading-2 mt-card">{{ t('Headings.FilterBy') }}</h2>

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

    const ics = useICS();

    const coaching = reactive({
      label: 'Headings.Coaching',
      text: 'text-info',
      bg: 'bg-info',
      bgLight: 'bg-info-light',
      border: 'border-info',
    });

    const exam = reactive({
      label: 'Headings.Exam',
      text: 'text-error',
      bg: 'bg-error',
      bgLight: 'bg-error-light',
      border: 'border-error',
    });

    const webinar = reactive({
      label: 'Headings.Webinar',
      text: 'text-warning',
      bg: 'bg-warning',
      bgLight: 'bg-warning-light',
      border: 'border-warning',
    });

    const types = computed(() => {
      return [webinar, coaching];
    });

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
    return { t, types, eventFilter, eventFilterOptions, ics };
  },
});
</script>

<style scoped></style>
