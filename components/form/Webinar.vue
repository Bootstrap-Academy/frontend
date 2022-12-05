<template>
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

		<InputBtn
			:loading="form.submitting"
			class="self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t(!!data ? 'Buttons.EditWebinar' : 'Buttons.CreateWebinar') }}
		</InputBtn>
	</form>
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
		// function setFormInputs(data: any) {}
		// watch(
		// 	() => props.data,
		// 	(newValue, oldValue) => {
		// 		setFormInputs(newValue);
		// 	},
		// 	{ deep: true, immediate: true }
		// );

		// ============================================================= functions
		const router = useRouter();

		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;
				const [success, error] = await createWebinar({
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
			openSnackbar('success', 'Success.CreateWebinar');
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
		};
	},
});
</script>

<style scoped></style>
