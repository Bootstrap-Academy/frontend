<template>
	<form
		class="flex flex-col gap-3"
		@submit.prevent="onclickSubmitForm()"
		ref="formRef"
	>
		<SectionTitle
			subheading="Subheadings.WebShop"
			heading="Headings.BuyMorphcoins"
			body="Body.MorphcoinRate"
			center
			class="mb-card"
		/>

		<article
			class="w-full max-w-full px-4 py-3 text-base text-white bg-secondary rounded-md relative z-10 grid gap-box grid-cols-[2em_auto_minmax(0,1fr)] items-center"
		>
			<img src="/images/euro.png" alt="coin" class="w-8 h-8 object-contain" />
			<h3 class="text-heading-3">{{ t('Headings.Euros') }}</h3>
			<input
				type="number"
				class="bg-transparent text-right outline-none border-none appearance-none min-w-auto"
				v-model="form.euros.value"
			/>
		</article>

		<ArrowDownCircleIcon
			class="w-12 h-12 text-accent -my-6 relative z-20 mx-auto"
		/>

		<article
			class="w-full max-w-full px-4 py-3 text-base text-white bg-secondary rounded-md relative z-10 grid gap-box grid-cols-[2em_auto_minmax(0,1fr)] items-center"
		>
			<img src="/images/coin.png" alt="coin" class="w-8 h-8 object-contain" />
			<h3 class="text-heading-3">{{ t('Headings.Morphcoins') }}</h3>
			<input
				type="number"
				class="bg-transparent text-right outline-none border-none appearance-none min-w-auto"
				v-model="form.morphCoins.value"
				@input="form.morphCoins.valid = form.morphCoins.value >= 500"
			/>
		</article>

		<hr class="mt-card mb-card" />

		<article class="w-fit mb-card">
			<h2 class="text-accent text-sm uppercase">
				{{ t('Headings.TotalBill') }}
			</h2>
			<div class="flex items-center gap-box">
				<h1 class="m-0 text-heading-1">{{ form.euros.value }}</h1>
				<h3 class="m-0 text-heading-3 text-body">
					{{ t('Headings.Euros').toLocaleLowerCase() }}
				</h3>
			</div>
		</article>

		<InputCheckbox
			class="mb-card"
			label="Links.IAgreeTo"
			id="TermsAndConditions"
			:link="{
				to: '/docs/terms-and-conditions',
				label: 'Links.TermsAndConditions',
			}"
			target="_blank"
			v-model="termsAndConditions"
		/>

		<InputCheckbox
			class="mb-card"
			label="Links.RightToWithdrawal"
			id="RightToWithdrawal"
			:link="{
				to: '/docs/right-of-withdrawal',
				label: 'Links.RightToWithdrawalLink',
			}"
			target="_blank"
			v-model="confirmRightToWithdrawal"
		/>
		<InputCheckbox
			class="mb-card"
			id="DontUseRightToWithdrawal"
			label="Links.DontUseRightToWithdrawal"
			v-model="confirmDontUseRightToWithdrawal"
		/>

		<Btn
			full
			@click="onclickSubmitForm"
			:class="
				form.euros.valid && form.morphCoins.valid
					? ''
					: 'pointer-events-none opacity-60'
			"
		>
			{{ t('Buttons.BuyCoins') }}
		</Btn>

		<NuxtLink to="/morphcoins" class="mx-auto mt-card">
			<span class="text-accent">{{ t('Links.GetMorphCoins') }}</span>
			{{ t('Links.OtherWays') }}
		</NuxtLink>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { ArrowDownCircleIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';
import { IForm } from '~~/types/form';

export default defineComponent({
	components: { ArrowDownCircleIcon },
	props: {},
	setup(props) {
		const { t } = useI18n();
		const loading = ref(true);

		// ============================================================= refs
		const formRef = ref<HTMLFormElement | null>(null);

		const termsAndConditions = ref(false);
		const confirmRightToWithdrawal = ref(false);
		const confirmDontUseRightToWithdrawal = ref(false);

		// ============================================================= reactive
		const form = reactive<IForm>({
			euros: {
				valid: true,
				value: 5,
			},
			morphCoins: {
				valid: true,
				value: 500,
			},
			submitting: false,
			validate: () => {
				let isValid = true;

				for (const key in form) {
					if (key != 'validate' && key != 'body' && !form[key].valid) {
						isValid = false;
					}
				}

				return isValid;
			},
			body: () => {
				let obj: any = {};
				for (const key in form) {
					if (key != 'validate' && key != 'body') obj[key] = form[key].value;
				}
				return obj;
			},
		});

		const snackbar = useSnackbar();
		const user = <any>useUser();

		watch(
			() => form.euros.value,
			(newValue, oldValue) => {
				if (!!!newValue) return;

				form.euros.value = Number(newValue.toFixed(2));

				if (newValue > 10_000) {
					form.euros.value = oldValue;
					form.euros.valid = false;
					snackbar.value = {
						show: true,
						type: 'error',
						heading: 'Error.MaxEuros',
						body: '',
					};
				} else if (newValue < 5) {
					form.euros.valid = false;
					snackbar.value = {
						show: true,
						type: 'error',
						heading: 'Error.MinEuros',
						body: '',
					};
				} else {
					form.euros.valid = true;
				}

				form.morphCoins.value = form.euros.value * 100;
			},
			{ deep: true }
		);

		watch(
			() => form.morphCoins.value,
			(newValue, oldValue) => {
				if (!!!newValue) return;

				form.morphCoins.value = Number(newValue.toFixed(2));

				if (newValue > 1000_000) {
					form.morphCoins.value = oldValue;
					form.morphCoins.valid = false;
					snackbar.value = {
						show: true,
						type: 'error',
						heading: 'Error.MaxMorphcoins',
						body: '',
					};
				} else if (newValue < 500) {
					form.morphCoins.valid = false;
					snackbar.value = {
						show: true,
						type: 'error',
						heading: 'Error.MinMorphcoins',
						body: '',
					};
				} else {
					form.morphCoins.valid = true;
				}

				form.euros.value = form.morphCoins.value / 100;
			},
			{ deep: true }
		);

		// ============================================================= functions
		const router = useRouter();
		async function onclickSubmitForm() {
			let email_verified = user?.value?.email_verified ?? false;
			if (!email_verified) {
				snackbar.value = {
					show: true,
					type: 'error',
					heading: 'Error.AccountNotVerified',
					body: '',
				};
				return;
			}

			if (
				termsAndConditions.value &&
				confirmRightToWithdrawal.value &&
				confirmDontUseRightToWithdrawal.value
			) {
				router.push(`/morphcoins/paypal?coins=${form.morphCoins.value}`);
			} else {
				openSnackbar(
					'error',
					'Error.MustAgreeToBothPointsInOrderToMoveForward'
				);
			}
		}

		return {
			form,
			onclickSubmitForm,
			formRef,
			loading,
			t,
			termsAndConditions,
			confirmRightToWithdrawal,
			confirmDontUseRightToWithdrawal,
		};
	},
});
</script>

<style scoped></style>
