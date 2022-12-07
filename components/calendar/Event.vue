<template>
	<article
		class="p-4 style-card lg:style-box bg-secondary border-l-4"
		:class="[theme.border, { 'cursor-pointer': !!link }]"
		@click.self="onclickCard"
	>
		<header class="flex justify-between gap-card">
			<div v-if="type == 'coaching'" class="flex gap-box">
				<img
					:src="instructor?.avatar_url ?? '/images/about-2.webp'"
					class="w-6 h-6 object-cover rounded-[50px]"
					alt=""
				/>

				<h3 class="capitalize text-heading-4">
					{{ instructor?.display_name ?? type }}
				</h3>
			</div>
			<h3 v-else class="capitalize text-heading-4">
				{{ heading }}
			</h3>

			<h3
				@click.self="onclickCard"
				v-if="!!link"
				:class="[theme.text, theme.bgLight]"
				class="py-1 px-2 rounded text-body-2 w-fit flex-shrink-0 h-fit"
			>
				{{ t(mine ? 'Buttons.MyWebinarLink' : 'Buttons.JoinLink') }}
			</h3>
		</header>

		<IconText
			v-for="(stat, i) of stats"
			:key="i"
			:icon="stat.icon"
			class="w-full my-2.5"
			:highlightIcon="false"
			sm
			:iconColor="theme.text"
			:fill="theme.fill"
		>
			{{ stat.value }}
		</IconText>

		<CalendarEventBooking
			:type="type"
			:id="id"
			:theme="theme"
			:data="data"
			:subSkillID="subSkillID"
			:stats="stats"
			:link="link"
			:noBooking="noBooking"
			:mine="mine"
		/>
	</article>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ClockIcon, CalendarIcon } from '@heroicons/vue/24/outline/index.js';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';

export default defineComponent({
	components: { ClockIcon, CalendarIcon, IconMorphcoin },
	props: {
		data: { type: Object as PropType<any>, default: null },
		subSkillID: { type: String, default: '' },
		noBooking: { type: Boolean, default: false },
	},
	setup(props) {
		const { t } = useI18n();

		const id = computed(() => {
			return props.data?.id ?? '';
		});

		const type = computed(() => {
			let eventType = props.data?.type ?? '';
			if (!!eventType) {
				return eventType;
			}

			let isWebinar = props.data?.participants ?? null;
			if (isWebinar != null) {
				return 'webinar';
			} else {
				return 'coaching';
			}
		});

		const theme = computed(() => {
			switch (type.value) {
				case 'coaching':
					return getTheme('info');
				default:
					return getTheme('warning');
			}
		});

		const heading = computed(() => {
			return props.data?.title ?? props.data?.name ?? type.value;
		});

		const instructor = computed(() => {
			return props.data?.coaching?.instructor ?? props.data?.instructor ?? null;
		});

		const user: Ref<any> = useUser();

		const mine = computed(() => {
			let instructorID = instructor.value?.id ?? '';
			if (!!!instructorID) return false;

			return user.value.id == instructorID;
		});

		const start = computed(() => {
			return getTimeAndDate(props.data?.start ?? -1);
		});

		const end = computed(() => {
			return getTimeAndDate(props.data?.end ?? -1);
		});

		function getTimeAndDate(timestamp: number) {
			if (timestamp == -1) {
				return { time: ``, date: `` };
			}

			let { date, month, year } = convertTimestampToDate(timestamp);
			let time = new Date(timestamp * 1000).toLocaleTimeString();
			let [hr, min, sec] = time.split(':');

			return {
				time: `${hr}:${min}`,
				date: `${date} ${month.string.slice(0, 3)}, ${year}`,
			};
		}

		const price = computed(() => {
			return props.data?.price ?? props.data?.coaching?.price ?? 0;
		});

		const stats = computed(() => {
			return [
				{
					icon: CalendarIcon,
					value:
						start.value.date != end.value.date
							? `${start.value.date} - ${end.value.date}`
							: start.value.date,
					heading: 'Headings.Date',
				},
				{
					icon: ClockIcon,
					value: `${start.value.time} - ${end.value.time}`,
					heading: 'Headings.Time',
				},
				{
					icon: IconMorphcoin,
					value: t(
						'Headings.Morphcoins',
						{ n: abbreviateNumber(price.value) },
						price.value
					),
					heading: 'Headings.Price',
				},
			];
		});

		const link = computed(() => {
			return props.data?.link ?? props.data?.location ?? '';
		});

		function onclickCard() {
			if (!!window && !!link.value) {
				window.open(link.value, '_blank');
			}
		}

		return {
			t,
			id,
			type,
			theme,
			heading,
			instructor,
			stats,
			link,
			onclickCard,
			mine,
		};
	},
});
</script>

<style scoped></style>
