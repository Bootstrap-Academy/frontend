<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<InputMedia class="mx-auto" id="image" rounded no-input v-model="image">
			<template #hint="{ t }">
				{{ t('Links.GravatarImage') }}
				<a
					href="https://de.gravatar.com/"
					target="_blank"
					class="cursor-pointer"
				>
					gravatar.com
				</a>
			</template>
		</InputMedia>

		<Input
			:label="t('Inputs.Nickname')"
			:hint="hintNickname"
			v-model="form.name.value"
			@valid="form.name.valid = $event"
			:rules="form.name.rules"
		/>

		<Input
			:label="t('Inputs.Name')"
			v-model="form.display_name.value"
			@valid="form.display_name.valid = $event"
			:rules="form.display_name.rules"
		/>

		<Input
			:label="t('Inputs.EmailAddress')"
			v-model="form.email.value"
			@valid="form.email.valid = $event"
			:rules="form.email.rules"
		/>

		<InputTextarea
			label="Inputs.Description"
			v-model="form.description.value"
			@valid="form.description.valid = $event"
			:rules="form.description.rules"
			:max="250"
		/>

		<InputTags
			label="Inputs.Tags"
			v-model="form.tags.value"
			@valid="form.tags.valid = $event"
			:rules="form.tags.rules"
		/>

		<article class="mt-card">
			<h2 class="text-heading-2 font-black mb-box">
				{{ t('Headings.UserType') }}
			</h2>
			<button
				type="button"
				class="inline-block transition-basic font-heading text-xl py-3 px-4 style-box mr-7 min-w-[125px] cursor-pointer border-4 border-accent"
				:class="
					userType == 'person' ? 'bg-accent scale-105 text-black' : 'text-white'
				"
				@click="userType = 'person'"
			>
				{{ t('Headings.Person') }}
			</button>
			<button
				type="button"
				class="inline-block transition-basic font-heading text-xl py-3 px-4 style-box min-w-[125px] cursor-pointer border-4 border-accent"
				:class="
					userType == 'business'
						? 'bg-accent scale-105 text-black'
						: 'text-white'
				"
				@click="userType = 'business'"
			>
				{{ t('Headings.Business') }}
			</button>
		</article>

		<Input
			v-if="userType == 'business'"
			:label="t('Inputs.VAT_ID')"
			v-model="form.vatID.value"
			@valid="form.vatID.valid = $event"
			:rules="form.vatID.rules"
		/>

		<article class="mt-card mb-card">
			<h2 class="text-heading-2 font-black mb-box">
				{{ t('Inputs.Address') }}
			</h2>
			<Input
				:label="t('Inputs.Country')"
				v-model="form.country.value"
				@valid="form.country.valid = $event"
				:rules="form.country.rules"
			/>
			<Input
				:label="t('Inputs.AddressPrename')"
				v-model="form.addressPrename.value"
				@valid="form.addressPrename.valid = $event"
				:rules="form.addressPrename.rules"
			/>
			<Input
				:label="t('Inputs.AddressName')"
				v-model="form.addressName.value"
				@valid="form.addressName.valid = $event"
				:rules="form.addressName.rules"
			/>
			<Input
				:label="t('Inputs.AddressStreet')"
				v-model="form.addressStreet.value"
				@valid="form.addressStreet.valid = $event"
				:rules="form.addressStreet.rules"
			/>
			<Input
				:label="t('Inputs.AddressPLZ')"
				v-model="form.addressPLZ.value"
				@valid="form.addressPLZ.valid = $event"
				:rules="form.addressPLZ.rules"
			/>
		</article>

		<InputBtn
			:loading="form.submitting"
			class="self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t('Buttons.Safe') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	props: { data: { type: Object as PropType<any>, default: null } },
	setup(props) {
		const { t } = useI18n();

		const userType = ref('person');

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			email: {
				value: '',
				valid: false,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.EmailAddress',
					(v: string) => /.+@.+\..+/.test(v) || 'Error.InputEmailForm',
				],
			},
			name: {
				value: '',
				valid: false,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Nickname',
					(v: string) => v.length >= 3 || 'Error.InputMinLength_3',
					(v: string) => v.length <= 32 || 'Error.InputMinLength_32',
					(v: string) =>
						/^[a-zA-Z\d]{3,32}$/.test(v) || 'Error.InputNicknameError',
				],
			},
			display_name: {
				value: '',
				valid: false,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Name',
					(v: string) => v.length >= 3 || 'Error.InputMinLength_3',
					(v: string) => v.length <= 64 || 'Error.InputMinLength_64',
				],
			},
			description: {
				value: '',
				valid: true,
				rules: [
					(v: string) => !v || v.length >= 10 || 'Error.InputMinLength_10',
					(v: string) => v.length <= 250 || 'Error.InputMaxLength_250',
				],
			},
			tags: {
				value: [],
				valid: true,
				rules: [
					(v: string) =>
						!v ||
						!form.tags.value ||
						form.tags.value.length < 7 ||
						'Error.InputMaxTags_7',
				],
			},
			country: {
				value: '',
				valid: true,
				rules: [],
			},
			addressPrename: {
				value: '',
				valid: true,
				rules: [],
			},
			addressName: {
				value: '',
				valid: true,
				rules: [],
			},
			addressStreet: {
				value: '',
				valid: true,
				rules: [],
			},
			addressPLZ: {
				value: '',
				valid: true,
				rules: [],
			},
			vatID: {
				value: '',
				valid: true,
				rules: [],
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

		// ============================================================= Setting Form
		const image = computed(() => {
			return (
				props.data?.avatar_url ?? `/images/about-${getRandomNumber(1, 5)}.webp`
			);
		});

		const hintNickname = computed(() => {
			let timestamp = props.data?.last_name_change ?? '';
			if (!!!timestamp) return '';

			let after_30Days = timestamp + 60 * 60 * 24 * 30;
			const { date, month, year } = convertTimestampToDate(after_30Days);

			return t('Body.EditNickname', {
				placeholder: `${date} ${month.string}, ${year}`,
			});
		});

		function setFormInputs(data: any) {
			form.email.value = data?.email ?? '';
			form.name.value = data?.name ?? '';

			form.display_name.value = data?.display_name ?? '';
			form.display_name.valid = !!form.display_name.value;

			form.name.value = data?.name ?? '';
			form.name.valid = !!form.name.value;

			form.description.value = data?.description ?? '';

			form.tags.value = data?.tags ?? [];
		}

		watch(
			() => props.data,
			(newValue, oldValue) => {
				setFormInputs(newValue);
			},
			{ deep: true, immediate: true }
		);

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;

				const hasEmailChanged = form.email.value != (props.data?.email ?? '');

				const [success, error] = await editUser(form.body());
				form.submitting = false;

				success
					? successHandler(success, hasEmailChanged)
					: errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		const router = useRouter();

		async function successHandler(res: any, hasEmailChanged: boolean) {
			if (!hasEmailChanged) {
				openSnackbar('success', 'Success.EditProfile');
				return;
			}

			await refresh();
			const [success, error] = await requestEmailVerification();

			if (success) {
				openDialog(
					'success',
					'Headings.AddedEmail',
					t('Body.AddedEmail', { placeholder: res?.email ?? 'new email' }),
					true,
					{
						label: 'Buttons.VerifyAccount',
						onclick: () => {
							router.push('/auth/verify-account');
						},
					},
					null
				);
			} else {
				errorHandler(error);
			}
		}

		function errorHandler(res: any) {
			setFormInputs(props.data);

			let msg = res?.detail ?? '';

			msg =
				msg == 'Error.PermissionDenied'
					? `${t('Inputs.Nickname')}: ${hintNickname.value}`
					: msg;

			openSnackbar('error', msg);
		}

		return {
			form,
			onclickSubmitForm,
			refForm,
			t,
			image,
			hintNickname,
			userType,
		};
	},
});
</script>

<style scoped></style>
