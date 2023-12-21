<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.Nickname')"
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
			type="email"
			v-model="form.email.value"
			@valid="form.email.valid = $event"
			:rules="form.email.rules"
		/>

		<Input
			v-if="!register_token"
			:label="t('Inputs.Password')"
			type="password"
			v-model="form.password.value"
			@valid="form.password.valid = $event"
			:rules="form.password.rules"
		/>

		<InputCheckbox
			label="Links.IAgreeTo"
			id="TermsAndConditions"
			:link="{
				to: '/docs/terms-and-conditions',
				label: 'Links.TermsAndConditions',
			}"
			target="_blank"
			required
			v-model="form.termsAndConditions.value"
			@valid="form.termsAndConditions.valid = $event"
		/>

		<InputCheckbox
			label="Links.IAgreeTo"
			id="privacy"
			:link="{
				to: '/docs/privacy',
				label: 'Links.Privacy',
			}"
			target="_blank"
			required
			v-model="form.privacy.value"
			@valid="form.privacy.valid = $event"
		/>

		<InputCheckbox
			id="Newsletter"
			label="Links.Newsletter"
			v-model="form.newsletter.value"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-center"
			@click="onclickSubmitForm()"
			mb
			mt
		>
			{{ t('Buttons.CreateAccount') }}
		</InputBtn>

		<NuxtLink to="/auth/login" class="self-center">
			{{ t('Links.AlreadyHaveAccount') }}
			<span class="text-accent">{{ t('Links.GoToLogin') }}</span>
		</NuxtLink>
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

    // ============================================================= reactive
    const form = reactive<IForm>({
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
      termsAndConditions: {
        value: false,
        valid: false,
      },
      privacy: {
        value: false,
        valid: false,
      },
      newsletter: {
        value: false,
        valid: true,
      },
      submitting: false,
      validate: () => {
        let isValid = true;

        if (!!register_token.value) {
          form.password.valid = true;
        }

        for (const key in form) {
          if (
            key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						key != 'newsletter' &&
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
          if (
            key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						key != 'termsAndConditions' &&
						key != 'newsletter' &&
						key != 'privacy'
          )
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

    // ============================================================= OAuth Signup
    const route = useRoute();
    const register_token = computed(() => {
      return route?.query?.register_token ?? '';
    });
    onMounted(() => {
      if (!!register_token.value) {
        openDialog(
          'success',
          'Headings.OAuthSuccess',
          'Success.OAuthSuccess',
          true,
          {
            label: 'Buttons.Okay',
            onclick: () => {},
          },
          null
        );
      }
    });

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        let recaptcha_response = await getReCaptchaToken();

        const updatedBody = !!register_token.value
          ? {
            ...form.body(),
            recaptcha_response: recaptcha_response,
            oauth_register_token: register_token.value,
					  }
          : {
            ...form.body(),
            recaptcha_response: recaptcha_response,
					  };

        const [success, error] = await signup(updatedBody);

        if (!!success) await requestEmailVerification();

        let isNewsletter = false;
        if (!!success && !!form.newsletter.value) {
          const [suc, err] = await requestNewsletterRegistration();
          isNewsletter = !!suc;
        }

        form.submitting = false;

        success ? successHandler(success, isNewsletter) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    const router = useRouter();

    function successHandler(res: any, isNewsletter: boolean) {
      openDialog(
        'success',
        'Success.SignupSuccessful',
        `${t('Success.AccountCreated')} ${
          isNewsletter ? t('Success.NewsletterSignup') : ''
        }`,
        true,
        {
          label: 'Buttons.VerifyAccount',
          onclick: () => {
            router.push('/auth/verify-account');
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
      register_token,
    };
  },
});
</script>

<style scoped></style>
