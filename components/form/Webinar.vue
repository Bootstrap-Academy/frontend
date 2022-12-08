<template>
	<div>
		<form
			class="flex flex-col gap-box"
			:class="{ 'form-submitting': form.submitting }"
			@submit.prevent="onclickSubmitForm()"
			ref="refForm"
		>
			<Input
				:label="t('Inputs.Name')"
				v-model="form.name.value"
				@valid="form.name.valid = $event"
				:rules="form.name.rules"
			/>

			<InputTextarea
				label="Inputs.Description"
				v-model="form.description.value"
				@valid="form.description.valid = $event"
				:rules="form.description.rules"
				:max="250"
			/>

			<Input
				:label="t('Inputs.Link')"
				v-model="form.link.value"
				@valid="form.link.valid = $event"
				:rules="form.link.rules"
			/>

			<Input
				:label="t('Inputs.StartDate')"
				type="date"
				v-model="date"
				@valid="form.start.valid = $event"
				:rules="form.start.rules"
			/>

			<InputTime
				label="Inputs.StartTime"
				v-model="time"
				@valid="form.start.valid = $event"
			/>

			<Input
				:label="t('Inputs.Duration')"
				hint="Inputs.DurationHint"
				type="number"
				v-model="form.duration.value"
				@valid="form.duration.valid = $event"
				:rules="form.duration.rules"
			/>

			<Input
				:label="t('Inputs.MaxParticipants')"
				hint="(0 - 50)"
				type="number"
				v-model="form.max_participants.value"
				@valid="form.max_participants.valid = $event"
				:rules="form.max_participants.rules"
			/>

			<div class="md:flex">
				<Rating :rating="rating" class="mb-3 md:mb-0 md:mt-8 md:mr-6" />

				<Input
					:label="t('Inputs.Price')"
					:hint="inputPriceHint"
					type="number"
					v-model="form.price.value"
					@valid="form.price.valid = $event"
					:rules="form.price.rules"
					data-tooltip="Stars < 3, max price = 0MC. 3 - 4 stars max price is 5000MC. 4 - 4.5 stars max price is 10000MC. 4.5 and above stars have no max price limit. "
				/>
			</div>

			<p
				v-if="maxPrice > 0"
				class="text-body-1 py-2 px-4 text-warning bg-warning-light rounded-sm w-fit"
			>
				<span v-if="pricePerParticipant <= 0">
					{{ t('Headings.PricePerParticipantMsg') }}
				</span>
				<span v-else>
					{{ abbreviateNumber(pricePerParticipant) }}
					{{ t('Headings.PricePerParticipant') }}
				</span>
			</p>

			<div
				class="self-end flex gap-card items-center mt-card flex-wrap justify-center sm:justify-end"
			>
				<InputBtn tertiary @click="onclickDeleteWebinar" v-if="isEdit">
					{{ t('Buttons.DeleteWebinar') }}
				</InputBtn>
				<InputBtn :loading="form.submitting" @click="onclickSubmitForm()">
					{{ t(isEdit ? 'Buttons.EditWebinar' : 'Buttons.CreateWebinar') }}
				</InputBtn>
			</div>
		</form>
		<Modal v-if="confirm">
			<Dialog :dialog="dialog">
				<template #content>
					<div class="flex gap-box mt-card-sm">
						<p class="text-body-2">{{ t('Headings.TotalParticipants') }}</p>
						<h6 class="text-body-1">{{ numberOfUsers }}</h6>
					</div>

					<hr class="mt-card mb-card" />

					<h4 class="text-heading-4 mb-box">
						{{ t('Headings.CancellationPolicy') }}
					</h4>
					<List :items="cancellationPolicy" id="cancellationPolicy" />

					<hr class="mt-card mb-card" />

					<InputCheckbox
						id="IHaveReadWebinarDeletePolicy"
						label="Links.IHaveReadWebinarDeletePolicy"
						v-model="cancellationConfirmationCheck"
					/>
				</template>
			</Dialog>
		</Modal>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		skillID: { type: String, default: '' },
		rating: { type: Number, default: 0 },
	},
	setup(props) {
		const { t } = useI18n();

		const maxPrice = computed(() => {
			if (props.rating >= 4.5) return -1;
			else if (props.rating >= 4 && props.rating < 4.5) return 10000;
			else if (props.rating >= 3 && props.rating < 4) return 5000;
			else return 0;
		});

		const inputPriceHint = computed(() => {
			return t('Inputs.PriceHint', {
				placeholder: abbreviateNumber(maxPrice.value),
			});
		});

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			name: {
				value: '',
				valid: false,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Nickname',
					(v: string) => v.length >= 2 || 'Error.InputMinLength_2',
				],
			},
			description: {
				value: '',
				valid: true,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Description',
					(v: string) => !v || v.length >= 10 || 'Error.InputMinLength_10',
					(v: string) => v.length <= 250 || 'Error.InputMaxLength_250',
				],
			},
			link: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Link'],
			},
			start: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.StartDate'],
			},
			duration: {
				value: 0,
				valid: false,
				rules: [
					(v: number) => !!v || 'Error.InputEmpty_Inputs.Duration',
					(v: number) => !v || v >= 5 || 'Error.InputMinMins_5',
					(v: number) => v <= 1440 || 'Error.InputMaxMins_1440',
				],
			},
			max_participants: {
				value: 0,
				valid: false,
				rules: [
					(v: number) => !!v || 'Error.InputEmpty_Inputs.MaxParticipants',
					(v: number) => !v || v >= 4 || 'Error.InputMinParticipants_4',
					(v: number) => v <= 50 || 'Error.InputMaxParticipants_50',
				],
			},
			price: {
				value: 0,
				valid: maxPrice.value <= 0,
				rules: [
					(v: number) => !!v || v >= 0 || 'Error.InputEmpty_Inputs.Price',
					(v: number) => !v || v >= 1 || 'Error.InputMinPrice_1',
					(v: number) =>
						(maxPrice.value != -1 && v <= maxPrice.value) ||
						`Error.InputMaxPrice_${maxPrice.value}`,
				],
			},
			submitting: false,
			validate: () => {
				let isValid = true;

				for (const key in form) {
					if (
						key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						!form[key].valid
					) {
						isValid = false;
					}
				}

				if (refForm.value) refForm.value.reportValidity();
				return isValid;
			},
			body: () => {
				let obj: any = {};
				for (const key in form) {
					if (key != 'validate' && key != 'body' && key != 'submitting')
						obj[key] = form[key].value;
				}
				return obj;
			},
		});

		// ============================================================= Calculating Start Time
		const date = ref('');
		const time = ref('00:00:00');

		const startTime = computed(() => {
			const [hrs, mins, secs] = time.value.split(':');

			let dateObj = new Date(date.value);
			dateObj.setHours(parseInt(hrs));
			dateObj.setMinutes(parseInt(mins));
			dateObj.setSeconds(parseInt(secs));

			return convertDateToTimestamp(dateObj);
		});

		// ============================================================= Setting Form
		const isEdit = computed(() => {
			return !!props.data;
		});

		function setFormInputs(data: any) {
			form.name.value = data?.name ?? '';
			form.name.valid = !!form.name.value;

			form.description.value = data?.description ?? '';
			form.description.valid = !!form.description.value;

			form.link.value = data?.link ?? '';
			form.link.valid = !!form.link.value;

			form.max_participants.value = data?.max_participants ?? 0;
			form.max_participants.valid = !!form.max_participants.value;

			form.price.value = data?.price ?? 0;
			form.price.valid = true;

			let start = data?.start ?? 0;
			let end = data?.end ?? 0;

			if (!!start && start > 0) {
				const dateObj = convertTimestampToDate(start);
				const startDateObj = new Date(start * 1000);

				date.value = `${dateObj.year}-${dateObj.month.number + 1}-${
					dateObj.date
				}`;
				time.value = `${startDateObj.getHours()}:${startDateObj.getMinutes()}:00`;

				form.start.value = data?.start ?? 0;
				form.start.valid = !!form.start.value;

				start = start * 1000;
				end = end * 1000;

				form.duration.value = Math.round((end - start) / 60000);
				form.duration.valid = !!form.duration.value;
			}
		}
		watch(
			() => props.data,
			(newValue, oldValue) => {
				setFormInputs(newValue);
			},
			{ deep: true, immediate: true }
		);

		// ============================================================= functions
		const router = useRouter();

		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;

				const [success, error] = isEdit.value
					? await editWebinar(props.data.id, {
							...form.body(),
							start: startTime.value,
					  })
					: await createWebinar({
							...form.body(),
							skill_id: props.skillID,
							start: startTime.value,
					  });
				form.submitting = false;

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		async function successHandler(res: any) {
			openSnackbar(
				'success',
				isEdit.value ? 'Success.EditWebinar' : 'Success.CreateWebinar'
			);
			router.push(`/calendar?start=${res.start}`);
		}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
		}

		const pricePerParticipant = computed(() => {
			const price = parseInt(form.price.value ?? 0);
			const maxParticipants = parseInt(form.max_participants.value ?? 0);

			if (!!!price || price <= 0) return 0;
			if (!!!maxParticipants || maxParticipants <= 0) return 0;

			let ans = price / maxParticipants;
			ans = Number(ans.toFixed(2));

			return ans;
		});

		// ============================================================= Delete Webinar
		const confirm = ref(false);
		const dialog = <any>reactive({});
		const cancellationPolicy = reactive([
			'List.WebinarCancellationByOwnerPolicy.1',
			'List.WebinarCancellationByOwnerPolicy.2',
		]);

		const numberOfUsers = computed(() => {
			return props.data?.participants ?? 0;
		});

		const cancellationConfirmationCheck = ref(false);

		function onclickDeleteWebinar() {
			Object.assign(dialog, {
				type: 'warning',
				heading: 'Headings.DeleteWebinar',
				body:
					numberOfUsers.value > 0
						? 'Body.ConfirmDeleteWebinarGreaterThan0'
						: 'Body.ConfirmDeleteWebinarLessThan0',
				primaryBtn: {
					label: 'Buttons.YesDeleteWebinar',
					onclick: async () => {
						if (cancellationConfirmationCheck.value == false) {
							openSnackbar(
								'error',
								'Error.MustAgreeBeforeInOrderToDeleteWebinar'
							);
							return;
						}
						setLoading(true);

						const [success, error] = await deleteWebinar(props.data?.id ?? '');
						setLoading(false);
						confirm.value = false;

						if (success) {
							router.push(`/calendar`);
						}

						setTimeout(() => {
							openSnackbar(
								success ? 'success' : 'error',
								success ? 'Success.DeleteWebinar' : error?.details ?? ''
							);
						}, 1000);
					},
				},
				secondaryBtn: {
					label: 'Buttons.Cancel',
					onclick: () => {
						confirm.value = false;
					},
				},
			});
			confirm.value = true;
		}

		return {
			form,
			onclickSubmitForm,
			refForm,
			t,
			pricePerParticipant,
			maxPrice,
			inputPriceHint,
			date,
			time,
			startTime,
			onclickDeleteWebinar,
			numberOfUsers,
			dialog,
			cancellationPolicy,
			confirm,
			cancellationConfirmationCheck,
			isEdit,
		};
	},
});
</script>

<style scoped></style>
