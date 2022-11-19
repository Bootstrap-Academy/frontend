<template>
	<article
		v-if="full"
		class="cursor-pointer bg-secondary rounded shadow-lg card-sm lg:box border-l-4 grid gap-4"
		:class="classes.border"
	>
		<a :href="link" target="_blank" class="appearance-none grid gap-y-1 w-full">
			<h3 class="capitalize text-heading-4">
				{{ title }}
			</h3>

			<p :class="{ 'text-sm mt-0 mb-2': !!description }">
				{{ description }}
			</p>

			<IconText
				v-for="(stat, i) of stats"
				:key="i"
				:icon="stat.icon"
				class="w-full my-1"
				:highlightIcon="false"
				sm
				:iconColor="classes.text"
				:fill="classes.fill"
			>
				<span class="text-body">
					{{ stat.value }}
					{{ t(stat.label) }}
				</span>
			</IconText>
		</a>

		<Btn
			v-if="type != 'webinar'"
			sm
			@click.self="onclickCancelCalendarEvent"
			class="justify-self-end w-fit"
			:class="[classes.bg, classes.border]"
		>
			{{ t('Buttons.CancelEvent') }}
		</Btn>
	</article>

	<article
		v-else
		class="max-w-full p-0 lg:py-1 lg:px-2 rounded shadow-lg flex lg:gap-2 justify-between items-center h-fit"
		:class="classes.bgLight"
	>
		<span
			class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-xl flex-shrink-0 block"
			:class="classes.bg"
		></span>
		<h3 class="text-xs capitalize hidden lg:clamp line-1" :class="classes.text">
			{{ title }}
		</h3>
	</article>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';
import {
	LinkIcon,
	UsersIcon,
	ClockIcon,
	CheckIcon,
} from '@heroicons/vue/24/outline/index.js';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		full: { type: Boolean, default: false },
	},
	components: { IconMorphcoin, LinkIcon, UsersIcon, ClockIcon, CheckIcon },
	setup(props) {
		const { t } = useI18n();

		const id = computed(() => {
			return props.data?.id ?? '';
		});

		const type = computed(() => {
			return (props.data?.type ?? 'webinar').toLocaleLowerCase();
		});

		const title = computed(() => {
			return props.data?.title ?? props.data?.type ?? '';
		});

		const description = computed(() => {
			return props.data?.description ?? ``;
		});

		const link = computed(() => {
			return props.data?.location ?? '';
		});

		const timings = computed(() => {
			let start = props.data?.start ?? -1;
			let end = props.data?.end ?? -1;

			if (start == -1 || end == -1) {
				return '';
			}

			let startTime = new Date(start * 1000).toLocaleTimeString();
			let endTime = new Date(end * 1000).toLocaleTimeString();

			let startTimeArr = startTime.split(':');
			let endTimeArr = endTime.split(':');

			return `${startTimeArr[0]}:${startTimeArr[1]} - ${endTimeArr[0]}:${endTimeArr[1]}`;
		});

		const stats = computed(() => {
			return [
				{
					value: timings.value,
					icon: ClockIcon,
					label: '',
				},
				!!(props.data?.link ?? '') && type.value == 'webinar'
					? { icon: LinkIcon, label: 'Headings.Link' }
					: {
							value: abbreviateNumber(props.data?.price ?? 0),
							icon: IconMorphcoin,
							label:
								(props.data?.price ?? 0) > 1
									? 'Headings.Morphcoins'
									: 'Headings.Morphcoin',
					  },
				// {
				// 	value: abbreviateNumber(props.data?.participants ?? 0),
				// 	icon: UsersIcon,
				// 	label:
				// 		(props.data?.participants ?? 0) > 1
				// 			? 'Headings.Participants'
				// 			: 'Headings.Participant',
				// },
			];
		});

		const classes = computed(() => {
			switch (type.value) {
				case 'coaching':
					return {
						text: 'text-info',
						fill: 'fill-info',
						stroke: 'stroke-info',
						bg: 'bg-info',
						bgLight: 'bg-info-light',
						border: 'border-info',
					};
				case 'exam':
					return {
						text: 'text-error',
						fill: 'fill-error',
						stroke: 'stroke-error',
						bg: 'bg-error',
						bgLight: 'bg-error-light',
						border: 'border-error',
					};
				default:
					return {
						text: 'text-warning',
						fill: 'fill-warning',
						stroke: 'stroke-warning',
						bg: 'bg-warning',
						bgLight: 'bg-warning-light',
						border: 'border-warning',
					};
			}
		});

		const loading = ref(false);
		const isEventCancelled = ref(false);
		async function onclickCancelCalendarEvent() {
			openDialog(
				'info',
				'Buttons.CancelEvent',
				'Body.AreYouSureCancelEvent',
				false,
				{
					text: 'Buttons.YesCancelEvent',
					onclick: async () => {
						loading.value = true;
						const [success, error] = await cancelCalendarEvent(id.value);
						await getCalendar();
						loading.value = false;

						isEventCancelled.value = !!success;
					},
				},
				null
			);
		}

		return {
			loading,
			t,
			classes,
			title,
			description,
			timings,
			stats,
			link,
			type,
			onclickCancelCalendarEvent,
			isEventCancelled,
			CheckIcon,
		};
	},
});
</script>

<style scoped></style>
