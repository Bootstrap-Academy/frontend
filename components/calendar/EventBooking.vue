<template>
	<div class="mt-4 flex justify-end">
		<NuxtLink :to="`/webinars/${data.id}`" v-if="mine">
			<Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
				{{ t('Buttons.EditWebinar') }}
			</Btn>
		</NuxtLink>

		<Chip v-else-if="isEventBooked" :icon="CheckIcon" color="bg-success">
			{{ t('Headings.Booked') }}
		</Chip>

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
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref } from 'vue';
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
	},
	setup(props) {
		const { t } = useI18n();

		const user: Ref<any> = useUser();

		const mine = computed(() => {
			let instructorID = props.data?.instructor?.id ?? '';
			if (!!!instructorID) return false;

			return user.value.id == instructorID;
		});

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
			mine,
		};
	},
});
</script>

<style scoped></style>
