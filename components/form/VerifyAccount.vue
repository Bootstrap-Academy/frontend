<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.VerificationCode')"
			v-model="form.code.value"
			@valid="form.code.valid = $event"
			:rules="form.code.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-center"
			@click="onclickSubmitForm()"
			mt
			mb
		>
			{{ t('Buttons.VerifyAccount') }}
		</InputBtn>

		<a
			v-if="user"
			@click.prevent="resendAccountVerificationCode"
			class="self-center cursor-pointer"
		>
			{{ t('Buttons.ResendAccountVerificationCode') }}
		</a>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IForm } from '~/types/form';

export default defineComponent({
  emits: ['status'],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      code: {
        valid: false,
        value: '',
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.VerificationCode',
          (v: string) =>
            /^([a-zA-Z\d]{4}-){3}[a-zA-Z\d]{4}$/.test(v) ||
						'Error.InputCodeFormat',
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

    // ============================================================= Resent Code
    async function resendAccountVerificationCode() {
      form.submitting = true;
      const [success, error] = await requestEmailVerification();
      form.submitting = false;

      if (success) {
        openSnackbar('success', 'Success.ResendAccountVerificationCode');
      } else errorHandler(error);
    }

    // ============================================================= functions
    const user = <any>useUser();
    const router = useRouter();

    async function onclickSubmitForm() {
      if (user.value) {
        let email = user?.value?.email ?? '';
        if (!!!email) {
          openDialog(
            'warning',
            'Headings.MissingEmail',
            'Body.MissingEmail',
            true,
            {
              label: 'Buttons.AddEmail',
              onclick: () => {
                router.push('/profile/edit');
              },
            },
            null
          );
          return;
        }
      }

      if (form.validate()) {
        form.submitting = true;
        const [success, error] = await verifyAccount(form.body());
        form.submitting = false;

        success
          ? await successHandler(success)
          : errorHandler({
            detail: 'Error.VerifyEmail',
					  });
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    async function successHandler(res: any) {
      const [success, error] = await refresh();

      if (!!success) {
        emit('status', 'success');
      }
    }

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      resendAccountVerificationCode,
      user,
    };
  },
});
</script>

<style scoped></style>
