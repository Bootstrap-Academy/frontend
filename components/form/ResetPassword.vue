<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.ResetPasswordCode')"
			v-model="form.code.value"
			@valid="form.code.valid = $event"
			:rules="form.code.rules"
		/>

		<Input
			:label="t('Inputs.EmailAddress')"
			v-model="form.email.value"
			@valid="form.email.valid = $event"
			:rules="form.email.rules"
		/>

		<Input
			:label="t('Inputs.Password')"
			type="password"
			v-model="form.password.value"
			@valid="form.password.valid = $event"
			:rules="form.password.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-center"
			@click="onclickSubmitForm()"
			mt
			mb
		>
			{{ t('Buttons.ResetPassword') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IForm } from '~/types/form';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      code: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.ResetPasswordCode',
          (v: string) =>
            /^([a-zA-Z\d]{4}-){3}[a-zA-Z\d]{4}$/.test(v) ||
						'Error.InputCodeFormat',
        ],
      },
      email: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.EmailAddress',
          (v: string) => /.+@.+\..+/.test(v) || 'Error.InputEmailForm',
        ],
      },
      password: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Password',
          (v: string) =>
            /^((?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,})?$/.test(v) ||
						'Error.InputPasswordError',
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

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        const [success, error] = await resetPassword(form.body());
        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    const router = useRouter();

    function successHandler(res: any) {
      openDialog(
        'success',
        'Success.PasswordChanged',
        'Success.PasswordChangedBody',
        true,
        {
          label: 'Buttons.Okay',
          onclick: () => {
            router.push('/auth/login');
          },
        },
        null
      );
    }

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
    };
  },
});
</script>

<style scoped></style>
