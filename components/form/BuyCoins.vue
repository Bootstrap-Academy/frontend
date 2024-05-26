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
			class="w-full max-w-full px-4 py-3 text-base text-white bg-secondary rounded-md relative z-10 grid gap-box grid-cols-[2em_auto_minmax(0,1fr)] items-center border transition-all"
			:class="[!form.euros.valid ? 'border-error' : 'border-transparent']"
		>
			<img src="/images/euro.png" :alt="t('AltAttributes.Euro')" class="w-8 h-8 object-contain" />
			<h3 class="text-heading-3">{{ t('Headings.Euros') }}</h3>
			<input
				id="Euros"
				name="Euros"
				type="number"
				class="bg-transparent text-right outline-none border-none appearance-none min-w-auto"
				@change="onchangeValidateEuros()"
				@input="oninputValidateEuros($event)"
				:value="form.euros.value"
			/>
		</article>

		<ArrowDownCircleIcon
			class="w-12 h-12 text-accent -my-6 relative z-20 mx-auto"
		/>

		<article
			class="w-full max-w-full px-4 py-3 text-base text-white bg-secondary rounded-md relative z-10 grid gap-box grid-cols-[2em_auto_minmax(0,1fr)] items-center border transition-all"
			:class="[!form.morphCoins.valid ? 'border-error' : 'border-transparent']"
		>
			<img
				src="/images/coin.png"
				:alt="t('AltAttributes.Morphcoin')"
				class="w-8 h-8 object-contain"
			/>
			<h3 class="text-heading-3">{{ t('Headings.Morphcoins') }}</h3>
			<input
				id="Morphcoins"
				name="Morphcoins"
				type="number"
				class="bg-transparent text-right outline-none border-none appearance-none min-w-auto"
				@change="onchangeValidateMorphcoins()"
				@input="oninputValidateMorphcoins($event)"
				:value="form.morphCoins.value"
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
			v-model="form.termsAndConditions.value"
			@valid="form.termsAndConditions.valid = $event"
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
			v-model="form.confirmRightToWithdrawal.value"
			@valid="form.confirmRightToWithdrawal.valid = $event"
		/>
		<InputCheckbox
			class="mb-card"
			id="DontUseRightToWithdrawal"
			label="Links.DontUseRightToWithdrawal"
			v-model="form.confirmDontUseRightToWithdrawal.value"
			@valid="form.confirmDontUseRightToWithdrawal.valid = $event"
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
import type { IForm } from '~~/types/form';

export default defineComponent({
  components: { ArrowDownCircleIcon },
  props: {},
  setup(props) {
    const { t } = useI18n();

    const formRef = ref<HTMLFormElement | null>(null);

    const form = reactive<IForm>({
      euros: {
        valid: true,
        value: 5,
      },
      morphCoins: {
        valid: true,
        value: 500,
      },
      termsAndConditions: {
        value: false,
        valid: false,
      },
      confirmRightToWithdrawal: {
        value: false,
        valid: false,
      },
      confirmDontUseRightToWithdrawal: {
        value: false,
        valid: false,
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
            console.log(key);
          }
        }

        return isValid;
      },
      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != 'validate' && key != 'body' && key != 'submitting') {
            obj[key] = form[key].value;
          }
        }
        return obj;
      },
    });

    // ============================================================= Form
    const user = <any>useUser();
    const router = useRouter();

    async function onclickSubmitForm() {
      let email_verified = user?.value?.email_verified ?? false;
      if (!email_verified) {
        openSnackbar('error', 'Error.AccountNotVerified');
        return;
      }

      if (form.validate()) {
        router.push(`/morphcoins/paypal?coins=${form.morphCoins.value}`);
      } else {
        openSnackbar(
          'error',
          'Error.MustAgreeToBothPointsInOrderToMoveForward'
        );
      }
    }

    // ============================================================= Handling Euros
    const MAX_EUROS = 10_000;
    const MIN_EUROS = 5;
    let euroErrorMsg = '';
    function oninputValidateEuros(event: any) {
      let currentVal = event?.target?.value ?? form.euros.value;
      currentVal = roundOffTo(currentVal, 2);

      if (currentVal > MAX_EUROS) {
        currentVal = form.euros.value;
        openSnackbar('error', 'Error.MaxEuros');
        euroErrorMsg = '';
      } else if (currentVal < MIN_EUROS) {
        form.euros.valid = false;
        euroErrorMsg = 'Error.MinEuros';
      } else {
        form.euros.valid = true;
        euroErrorMsg = '';
      }

      event.target.value = currentVal;
      form.euros.value = currentVal;

      form.morphCoins.value = form.euros.value * 100;
    }

    function onchangeValidateEuros() {
      if (!!euroErrorMsg) openSnackbar('error', euroErrorMsg);
    }

    // ============================================================= Handling Morphcoins
    const MAX_MORPHCOINS = 1000_000;
    const MIN_MORPHCOINS = 500;
    let morphcoinsErrorMsg = '';
    function oninputValidateMorphcoins(event: any) {
      let currentVal = event?.target?.value ?? form.morphCoins.value;
      currentVal = roundOffTo(currentVal, 2);

      if (currentVal > MAX_MORPHCOINS) {
        currentVal = form.morphCoins.value;
        openSnackbar('error', 'Error.MaxMorphcoins');
        morphcoinsErrorMsg = '';
      } else if (currentVal < MIN_MORPHCOINS) {
        form.morphCoins.valid = false;
        morphcoinsErrorMsg = 'Error.MinMorphcoins';
      } else {
        form.morphCoins.valid = true;
      }

      event.target.value = currentVal;
      form.morphCoins.value = currentVal;

      form.euros.value = form.morphCoins.value / 100;
    }

    function onchangeValidateMorphcoins() {
      if (!!morphcoinsErrorMsg) openSnackbar('error', morphcoinsErrorMsg);
    }

    return {
      t,
      form,
      formRef,
      onclickSubmitForm,

      oninputValidateEuros,
      onchangeValidateEuros,

      oninputValidateMorphcoins,
      onchangeValidateMorphcoins,
    };
  },
});
</script>

<style scoped></style>
