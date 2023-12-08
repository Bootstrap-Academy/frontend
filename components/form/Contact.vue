<template>
	<form
		:key="keyForm"
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
		<Input
			:label="t('Inputs.EmailAddress')"
			type="email"
			v-model="form.email.value"
			@valid="form.email.valid = $event"
			:rules="form.email.rules"
		/>
		<Input
			:label="t('Inputs.Subject')"
			v-model="form.subject.value"
			@valid="form.subject.valid = $event"
			:rules="form.subject.rules"
		/>
		<InputTextarea
			label="Inputs.Message"
			v-model="form.message.value"
			@valid="form.message.valid = $event"
			:rules="form.message.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t('Buttons.SendMessage') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReCaptcha } from 'vue-recaptcha-v3';
import type { IForm } from '~/types/form';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);
    const keyForm = ref(0);

    // ============================================================= reactive
    const form = reactive<IForm>({
      email: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.EmailAddress',
          (v: string) => /.+@.+\..+/.test(v) || 'Error.InputEmailForm',
        ],
      },
      name: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Name',
          (v: string) => v.length >= 2 || 'Error.InputMinLength_2',
          (v: string) => v.length <= 256 || 'Error.InputMaxLength_256',
        ],
      },
      subject: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Subject',
          (v: string) => v.length >= 2 || 'Error.InputMinLength_2',
          (v: string) => v.length <= 256 || 'Error.InputMaxLength_256',
        ],
      },
      message: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Message',
          (v: string) => v.length >= 10 || 'Error.InputMinLength_10',
          (v: string) => v.length <= 4096 || 'Error.InputMaxLength_4096',
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
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        let recaptcha_response = await getReCaptchaToken();

        const [success, error] = await contact({
          ...form.body(),
          recaptcha_response: recaptcha_response,
        });

        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    function successHandler(res: any) {
      form.email.value = '';
      form.name.value = '';
      form.subject.value = '';
      form.message.value = '';

      form.email.valid = false;
      form.name.valid = false;
      form.subject.valid = false;
      form.message.valid = false;

      keyForm.value = keyForm.value + 1;

      openSnackbar('success', 'Success.ContactUs');
    }

    function errorHandler(res: any) {
      openSnackbar('error', res);
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      keyForm,
    };
  },
});
</script>

<style scoped></style>
