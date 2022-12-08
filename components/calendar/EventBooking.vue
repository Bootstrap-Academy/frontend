<template>
	<div class="mt-4 flex justify-end">
		<NuxtLink :to="`/webinars/${data.id}`" v-if="mine">
			<Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
				{{ t('Buttons.EditWebinar') }}
			</Btn>
		</NuxtLink>

		<div v-else-if="isEventBooked" class="flex gap-card-sm">
			<Btn
				:bgColor="theme.bg"
				:borderColor="theme.border"
				sm
				tertiary
				@click="onclickCancel"
			>
				{{ t('Buttons.Cancel') }}
			</Btn>
			<Chip :icon="CheckIcon" color="bg-success">
				{{ t('Headings.Booked') }}
			</Chip>
		</div>

		<Chip v-else-if="isFilled" :color="theme.bg">
			<span class="w-20 text-center">
				{{ t('Headings.Full') }}
			</span>
		</Chip>

		<Btn
			v-else-if="!noBooking"
			:bgColor="theme.bg"
			:borderColor="theme.border"
			sm
			@click="onclickConfirm"
		>
			{{ t(btn) }}
		</Btn>

		<Modal v-if="confirm" class="z-100">
			<Dialog :dialog="dialog">
				<template #content>
					<hr class="mt-card text-transparent" />

					<p v-for="(stat, i) of stats" :key="i">
						{{ t(stat.heading) }}
						<span class="font-bold text-heading">
							{{ stat.value }}
						</span>
					</p>

					<hr class="mt-card mb-card" />

					<InputCheckbox
						id="RightToWithdrawal"
						class="mb-card-sm"
						label="Links.RightToWithdrawal"
						:link="{
							to: '/docs/right-of-withdrawal',
							label: 'Links.RightToWithdrawalLink',
						}"
						target="_blank"
						v-model="confirmRightToWithdrawal"
					/>
					<InputCheckbox
						id="DontUseRightToWithdrawal"
						label="Links.DontUseRightToWithdrawal"
						v-model="confirmDontUseRightToWithdrawal"
					/>
				</template>
			</Dialog>
		</Modal>

		<Modal v-if="confirmCancellation" class="z-100">
			<Dialog :dialog="dialog">
				<template #content>
					<div class="flex gap-box mt-card-sm">
						<p class="text-body-2">{{ t('Headings.TodayDate') }}:</p>
						<h6 class="text-body-1">{{ todayDate }}</h6>
					</div>
					<div class="flex gap-box">
						<p class="text-body-2">{{ t('Headings.EventStartDate') }}:</p>
						<h6 class="text-body-1">{{ startDate }}</h6>
					</div>
					<div class="flex gap-box">
						<p class="text-body-2">{{ t('Headings.DaysRemaining') }}:</p>
						<h6 class="text-body-1">{{ numberOfDaysUntil }} days</h6>
					</div>

					<hr class="mt-card mb-card" />

					<h4 class="text-heading-4 mb-box">
						{{ t('Headings.CancellationPolicy') }}
					</h4>
					<List :items="cancellationPolicy" id="cancellationPolicy" />
				</template>
			</Dialog>
		</Modal>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon } from '@heroicons/vue/24/outline/index.js';

export default defineComponent({
	components: { CheckIcon },
	props: {
		data: { type: Object as PropType<any>, default: null },
		theme: { type: Object as PropType<any>, default: null },
		stats: { type: Array as PropType<any[]>, default: [] },
		subSkillID: { type: String, default: '' },
		type: { type: String, default: 'webinar' },
		id: { type: String, default: '' },
		link: { type: String, default: '' },
		noBooking: { type: Boolean, default: false },
		mine: { type: Boolean, default: false },
	},
	setup(props) {
		const { t } = useI18n();

		const btn = computed(() => {
			switch (props.type) {
				case 'coaching':
					return 'Buttons.BookCoaching';
				default:
					return 'Buttons.BookWebinar';
			}
		});

		const isEventBooked = ref(props.type == 'webinar' && !!props.link);

		const isFilled = computed(() => {
			return (
				props.data &&
				props.type == 'webinar' &&
				!!props.data.participants &&
				!!props.data.max_participants &&
				props.data.participants >= props.data.max_participants
			);
		});

		const dialog = <any>reactive({});
		const confirm = ref(false);
		const confirmRightToWithdrawal = ref(false);
		const confirmDontUseRightToWithdrawal = ref(false);

		function onclickConfirm() {
			confirm.value = true;

			let btnText = '';
			let type = '';

			switch (props.type) {
				case 'coaching':
					btnText = 'Buttons.YesBookCoaching';
					type = 'info';
					break;
				default:
					btnText = 'Buttons.YesBookWebinar';
					type = 'warning';
					break;
			}

			Object.assign(dialog, {
				type: type,
				heading: btn.value,
				body: 'Body.ConfirmBooking',
				primaryBtn: {
					label: btnText,
					onclick: async () => {
						if (
							!confirmRightToWithdrawal.value ||
							!confirmDontUseRightToWithdrawal.value
						) {
							openSnackbar(
								'error',
								'Error.MustAgreeToBothPointsInOrderToMoveForward'
							);
							return;
						}

						setLoading(true);
						switch (props.type) {
							case 'coaching':
								await bookCoaching();
								break;
							default:
								await bookWebinar();
								break;
						}
						confirmRightToWithdrawal.value = false;
						confirmDontUseRightToWithdrawal.value = false;
						setLoading(false);
						confirm.value = false;
					},
				},
				secondaryBtn: {
					label: 'Buttons.Cancel',
					onclick: () => {
						confirm.value = false;
					},
				},
			});
		}

		async function bookCoaching() {
			const [success, error] =
				await bookCoachingForThisSubSkillWithThisInstructor(
					props.subSkillID ?? '',
					props.id ?? ''
				);

			openSnackbar(
				success ? 'success' : 'error',
				success ? 'Success.BookedCoaching' : error?.detail ?? ''
			);

			isEventBooked.value = !!success;
		}

		async function bookWebinar() {
			const [success, error] = await registerForWebinarByID(props.id ?? '');

			openSnackbar(
				success ? 'success' : 'error',
				success ? 'Success.BookedWebinar' : error?.detail ?? ''
			);

			isEventBooked.value = !!success;
		}

		const confirmCancellation = ref(false);
		const cancellationPolicy = reactive([
			'List.EventCancellationPolicy.1',
			'List.EventCancellationPolicy.2',
			'List.EventCancellationPolicy.3',
		]);

		const todayDate = ref('');
		const startDate = ref('');
		const numberOfDaysUntil = ref(0);

		function onclickCancel() {
			confirmCancellation.value = true;
			let btnText = '';
			let headingText = '';
			let type = '';

			switch (props.type) {
				case 'coaching':
					btnText = 'Buttons.YesCancelCoaching';
					headingText = 'Headings.CancelCoaching';
					type = 'info';
					break;
				default:
					btnText = 'Buttons.YesCancelWebinar';
					headingText = 'Headings.CancelWebinar';
					type = 'warning';
					break;
			}

			let refund = getCancellationRefundStatus();
			let body = t('Body.CancelEvent');

			if (refund == 100) {
				body = `${body} ${t('Body.CancelEvent100%')}`;
			} else if (refund == 50) {
				body = `${body} ${t('Body.CancelEvent50%')}`;
			} else {
				body = `${body} ${t('Body.CancelEvent0%')}`;
			}

			Object.assign(dialog, {
				type: type,
				heading: headingText,
				body: body,
				primaryBtn: {
					label: btnText,
					onclick: () => {},
				},
				secondaryBtn: {
					label: 'Buttons.Back',
					onclick: () => {
						confirmCancellation.value = false;
					},
				},
			});
		}

		function getCancellationRefundStatus() {
			let start = convertTimestampToDate(props.data.start);
			let today = convertTimestampToDate(new Date().getTime() / 1000);

			numberOfDaysUntil.value = start.date - today.date;
			todayDate.value = `${today.date} ${today.month.string}, ${today.year}`;
			startDate.value = `${start.date} ${start.month.string}, ${start.year}`;

			if (numberOfDaysUntil.value > 7) {
				return 100;
			} else if (numberOfDaysUntil.value > 1 && numberOfDaysUntil.value <= 7) {
				return 50;
			} else {
				return 0;
			}
		}

		return {
			t,
			btn,
			CheckIcon,
			isEventBooked,
			isFilled,
			onclickConfirm,
			dialog,
			confirm,
			confirmRightToWithdrawal,
			confirmDontUseRightToWithdrawal,
			onclickCancel,
			confirmCancellation,
			cancellationPolicy,
			todayDate,
			startDate,
			numberOfDaysUntil,
		};
	},
});
</script>

<style scoped></style>
