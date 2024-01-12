<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="confirmation()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.EmailOrUsername')"
			v-model="form.name_or_email.value"
			@valid="form.name_or_email.valid = $event"
			:rules="form.name_or_email.rules"
		/>
		<Input
			:label="t('Inputs.Password')"
			type="password"
			v-model="form.password.value"
			@valid="form.password.valid = $event"
		/>

		<InputOTP
			v-if="!needRecoveryCode"
			label="Inputs.MFACode"
			v-model="form.mfa_code.value"
			@valid="form.mfa_code.valid = $event"
			:rules="form.mfa_code.rules"
		/>

		<Input
			v-else
			label="Inputs.RecoveryCode"
			v-model="form.recovery_code.value"
			@valid="form.recovery_code.valid = needRecoveryCode ? $event : true"
			:rules="form.recovery_code.rules"
		/>

		<div class="self-end cursor-pointer">
			<NuxtLink
				tertiary
				v-if="needRecoveryCode"
				@click="needRecoveryCode = false"
			>
				{{ t('Links.HaveMFA') }}
			</NuxtLink>
			<NuxtLink tertiary v-else @click="needRecoveryCode = true">
				{{ t('Links.UseRecoveryCode') }}
			</NuxtLink>
		</div>

		<InputBtn
			:loading="form.submitting"
			class="self-center"
			@click="confirmation"
			mt
			mb
		>
			{{ t('Buttons.DisableMFA') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReCaptcha } from 'vue-recaptcha-v3';
import type { IForm } from '~/types/form';

export default defineComponent({
  emits: ['isSuccess'],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      name_or_email: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.EmailOrUsername',
        ],
      },
      password: {
        valid: false,
        value: '',
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Password'],
      },
      mfa_code: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.MFACode',
          (v: string) => v.length >= 6 || 'Error.InputMinLength_6',
        ],
      },
      recovery_code: {
        valid: true,
        value: '',
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.RecoveryCode'],
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

    // ============================================================= reCaptcha
    const { executeRecaptcha, recaptchaLoaded }: any = useReCaptcha();
    const getReCaptchaToken = async () => {
      try {
        await recaptchaLoaded();
        const token = await executeRecaptcha('login');
        return token;
      } catch (error) {
        return null;
      }
    };

    // ============================================================= functions
    const router = useRouter();

    function confirmation() {
      openDialog(
        'warning',
        'Headings.DisableMFA',
        'Body.AreYouSureDisableMFA',
        false,
        {
          label: 'Buttons.AreYouSureDisableMFA',
          onclick: async () => {
            await onclickSubmitForm();
          },
        },
        {
          label: 'Buttons.Cancel',
          onclick: () => {
            router.push('/account');
          },
        }
      );
    }

    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        let recaptcha_response = await getReCaptchaToken();

        const [success, error] = await login({
          ...form.body(),
          recaptcha_response: recaptcha_response,
        });

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    async function successHandler(res: any) {
      const [success, error] = await disableMFA();
      if (success) {
        await refresh();
        emit('isSuccess', true);
        form.submitting = false;
      } else {
        errorHandler(error);
      }
    }

    const needRecoveryCode = ref(false);

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
      emit('isSuccess', false);
      form.submitting = false;
    }

    return {
      form,
      refForm,
      t,
      confirmation,
      needRecoveryCode,
    };
  },
});
</script>

<style scoped></style>
