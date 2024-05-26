<template>
  <article class="bg-secondary card style-card flex flex-col items-center justify-center">
    <KeyIcon class="h-10 w-10 text-accent mb-4 max-w-xl" />

    <h2 class="text-heading-2">{{ t('Headings.ResetPassword') }}</h2>

    <div class="flex items-center space-x-4 mb-8 mt-2">
      <EnvelopeOpenIcon class="h-8 w-8 text-accent max-w-xl" />
      <p class="text-center">
        {{ t('Body.GetCodeViaEmail') }}
      </p>
    </div>

    <InputBtn :loading="loading" @click="onclick">
      {{ t('Buttons.ResetPassword') }}
    </InputBtn>
  </article>
</template>

<script lang="ts">
import { EnvelopeOpenIcon } from '@heroicons/vue/24/outline';
import { KeyIcon } from '@heroicons/vue/24/solid';
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReCaptcha } from 'vue-recaptcha-v3';

export default defineComponent({
  components: {
    KeyIcon,
    EnvelopeOpenIcon,
  },
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();
    const router = useRouter();

    const loading = ref(false);

    async function onclick() {
      let email = user?.value?.email ?? '';
      if (!!!email) {
        openDialog(
          'warning',
          'Headings.MissingEmail',
          'Body.MissingEmail',
          false,
          {
            label: 'Buttons.AddEmail',
            onclick: () => {
              router.push('/profile/edit');
            },
          },
          {
            label: 'Buttons.Cancel',
            onclick: () => {},
          }
        );
        return;
      }

      loading.value = true;
      let recaptcha_response = await getReCaptchaToken();

      const [success, error] = await forgotPassword({
        email: email,
        recaptcha_response: recaptcha_response,
      });
      loading.value = false;

      if (success) {
        openDialog(
          'success',
          'Success.RequestSubmitted',
          'Success.ResetPasswordRequestSent',
          true,
          {
            label: 'Buttons.GoToResetPassword',
            onclick: () => {
              router.push('/auth/reset-password');
            },
          },
          null
        );
      } else {
        openSnackbar('error', error?.detail ?? '');
      }
    }

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

    return { t, loading, onclick };
  },
});
</script>
