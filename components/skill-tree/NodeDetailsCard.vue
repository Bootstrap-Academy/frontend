<template>
	<div>
		<article
			class="cursor-pointer bg-secondary card lg:box style-box gap-3 grid"
		>
			<div v-if="instructor" class="flex gap-box mb-2">
				<img
					:src="instructor.avatar_url"
					class="w-6 h-6 object-cover rounded-[50px]"
					alt=""
				/>

				<h3 class="text-heading-4">{{ instructor.display_name }}</h3>
			</div>

			<IconText
				v-for="(stat, i) of stats"
				:key="i"
				:highlightIcon="false"
				:iconColor="theme.text"
				:fill="theme.fill"
				:icon="stat.icon"
			>
				{{ stat.value }}
				<span v-if="stat.label">{{ t(stat.label) }}</span>
			</IconText>

			<Chip
				v-if="isEventBooked || isWebinarBooked"
				class="w-fit justify-self-end mt-2"
				:icon="CheckIcon"
				color="bg-success"
			>
				{{ t('Headings.Booked') }}
			</Chip>

			<Chip
				v-else-if="isFilled"
				class="w-fit justify-self-end mt-2"
				color="bg-info"
			>
				{{ t('Headings.Full') }}
			</Chip>

			<Btn
				v-else
				@click="openConfirmDialog = true"
				:bgColor="theme.bg"
				:borderColor="theme.border"
				sm
				class="w-fit justify-self-end mt-2"
			>
				{{ t(btn) }}
			</Btn>
		</article>

		<LazyClientOnly>
			<Teleport to="#app-level">
				<Transition>
					<Modal v-if="openConfirmDialog">
						<DialogBox
							@close="openConfirmDialog = $event"
							:primaryBtn="primaryBtn"
							:secondaryBtn="secondaryBtn"
						>
							<template v-slot:heading>{{ t(btn) }}</template>
							<template v-slot:body>
								<p class="mb-card-sm">
									{{ t('Body.ConfirmBooking') }}
								</p>

								<p v-for="(stat, i) of stats" :key="i">
									{{ t(stat.heading) }}
									<span class="font-bold text-heading">
										{{ stat.value }} {{ t(stat.label) }}
									</span>
								</p>

								<InputCheckbox
									id="RightToWithdrawal"
									class="mt-card-sm"
									label="Links.RightToWithdrawal"
									:link="{
										to: '/docs/right-of-withdrawal',
										label: 'Links.RightToWithdrawalLink',
									}"
									target="_blank"
									required
									v-model="confirmRightToWithdrawal"
								/>
								<InputCheckbox
									id="DontUseRightToWithdrawal"
									class="mt-2 lg:mt-0"
									label="Links.DontUseRightToWithdrawal"
									required
									v-model="confirmDontUseRightToWithdrawal"
								/>
							</template>
						</DialogBox>
					</Modal>
				</Transition>
			</Teleport>
		</LazyClientOnly>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	ClockIcon,
	CalendarIcon,
	CheckIcon,
} from '@heroicons/vue/24/outline/index.js';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';

export default defineComponent({
	components: { ClockIcon, CalendarIcon, IconMorphcoin, CheckIcon },
	props: {
		data: { type: Object as PropType<any>, default: null },
		subSkillID: { default: '' },
		type: { default: 'webinar' },
	},
	emits: ['id'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const isWebinarBooked = computed(() => {
			return props.type == 'webinar' && !!props.data.link;
		});

		const confirmRightToWithdrawal = ref(false);
		const confirmDontUseRightToWithdrawal = ref(false);

		const openConfirmDialog = ref(false);

		const snackbar = useSnackbar();

		const type = computed(() => {
			return props.type.toLocaleLowerCase();
		});

		const theme = computed(() => {
			switch (type.value) {
				case 'exam':
					return getTheme('error');
				case 'coaching':
					return getTheme('info');
				default:
					return getTheme('warning');
			}
		});

		const btn = computed(() => {
			switch (type.value) {
				case 'exam':
					return 'Buttons.BookExam';
				case 'coaching':
					return 'Buttons.BookCoaching';
				default:
					return 'Buttons.BookWebinar';
			}
		});

		const isEventBooked = ref(false);

		async function bookExam() {
			const [success, error] = await bookExamsForThisSubSkill(props.subSkillID);

			snackbar.value = {
				show: true,
				type: success ? 'success' : 'error',
				heading: success ? 'Success.BookedExam' : error?.detail ?? '',
				body: '',
			};

			isEventBooked.value = !!success;
		}

		async function bookCoaching() {
			const [success, error] =
				await bookCoachingsForThisSubSkillWithThisInstructor(
					props.subSkillID,
					props.data.id
				);

			snackbar.value = {
				show: true,
				type: success ? 'success' : 'error',
				heading: success ? 'Success.BookedCoaching' : error?.detail ?? '',
				body: '',
			};

			isEventBooked.value = !!success;
		}

		async function bookWebinar() {
			const [success, error] = await registerForWebinarByID(
				props.data?.id ?? ''
			);

			snackbar.value = {
				show: true,
				type: success ? 'success' : 'error',
				heading: success ? 'Success.BookedWebinar' : error?.detail ?? '',
				body: '',
			};

			isEventBooked.value = !!success;
		}

		const instructor = computed(() => {
			return props.data?.coaching?.instructor ?? null;
		});

		const startDate = computed(() => {
			let start = props.data?.start ?? '';
			let { date, month, year } = convertTimestampToDate(start);
			return `${date} ${month.string.slice(0, 3)}, ${year}`;
		});

		const endDate = computed(() => {
			let end = props.data?.end ?? '';
			let { date, month, year } = convertTimestampToDate(end);
			return `${date} ${month.string.slice(0, 3)}, ${year}`;
		});

		const startTime = computed(() => {
			let start = props.data?.start ?? -1;

			if (start == -1) return '';

			let startTime = new Date(start * 1000).toLocaleTimeString();
			let startTimeArr = startTime.split(':');

			return `${startTimeArr[0]}:${startTimeArr[1]}`;
		});

		const endTime = computed(() => {
			let end = props.data?.end ?? -1;

			if (end == -1) return '';

			let endTime = new Date(end * 1000).toLocaleTimeString();
			let endTimeArr = endTime.split(':');

			return `${endTimeArr[0]}:${endTimeArr[1]}`;
		});

		const price = computed(() => {
			switch (type.value) {
				case 'exam':
					return props.data?.exam?.price ?? 0;
				case 'coaching':
					return props.data?.coaching?.price ?? 0;
				default:
					return props.data?.price ?? 0;
			}
		});

		const stats = computed(() => {
			return [
				{
					icon: CalendarIcon,
					value:
						startDate.value != endDate.value
							? `${startDate.value.split(',')[0]} - ${
									endDate.value.split(',')[0]
							  }`
							: startDate.value,
					label: '',
					heading: 'Headings.Date',
				},
				{
					icon: ClockIcon,
					value: `${startTime.value} - ${endTime.value}`,
					label: '',
					heading: 'Headings.Time',
				},
				{
					icon: IconMorphcoin,
					value: price.value,
					label: price.value > 1 ? 'Headings.Morphcoins' : 'Headings.Morphcoin',
					heading: 'Headings.Price',
				},
			];
		});

		const primaryBtn = computed(() => {
			let text = '';

			switch (type.value) {
				case 'exam':
					text = 'Buttons.YesBookExam';
					break;
				case 'coaching':
					text = 'Buttons.YesBookCoaching';
					break;
				default:
					text = 'Buttons.YesBookWebinar';
					break;
			}

			return {
				text: text,
				onclick: async () => {
					if (
						confirmRightToWithdrawal.value &&
						confirmDontUseRightToWithdrawal.value
					) {
						switch (type.value) {
							case 'exam':
								await bookExam();
								openConfirmDialog.value = false;
								break;
							case 'coaching':
								await bookCoaching();
								openConfirmDialog.value = false;
								break;
							default:
								await bookWebinar();
								openConfirmDialog.value = false;
								break;
						}
					} else {
						snackbar.value = {
							show: true,
							type: 'error',
							heading: 'Error.MustAgreeToBothPointsInOrderToMoveForward',
							body: '',
						};
					}
				},
			};
		});
		const secondaryBtn = computed(() => {
			return {
				text: 'Buttons.Cancel',
				onclick: () => {
					openConfirmDialog.value = false;
				},
			};
		});

		const isFilled = computed(() => {
			return (
				props.data &&
				type.value == 'webinar' &&
				props.data.participants >= props.data.max_participants
			);
		});

		return {
			t,
			stats,
			instructor,
			theme,
			btn,
			isEventBooked,
			CheckIcon,
			confirmRightToWithdrawal,
			confirmDontUseRightToWithdrawal,
			openConfirmDialog,
			primaryBtn,
			secondaryBtn,
			isWebinarBooked,
			isFilled,
		};
	},
});
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
	transition: all 0.25s ease-out;
}

.v-leave-to,
.v-enter-from {
	opacity: 0;
	transform: translateY(30px);
}
</style>
