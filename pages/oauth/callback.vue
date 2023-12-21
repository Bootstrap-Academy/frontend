<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Api implemented
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
	<section
		class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
	>
		<Transition mode="out-in" name="slide-up-down">
			<Dialog v-if="dialog && dialog.type" :dialog="dialog" />
		</Transition>
	</section>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'OAuth Login',
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    const dialog = <any>reactive({});
    const config = useRuntimeConfig().public;

    onMounted(async () => {
      setLoading(true);
      const [success, error] = await loginViaOAuthProvider({
        code: route?.query?.code ?? '',
        provider_id: route?.query?.state ?? '',
        redirect_uri: `${config.BASE_WEB_URL}/oauth/callback`,
      });
      setLoading(false);

      success ? successHandler(success) : errorHandler(error);
    });

    function successHandler(res: any) {
      const register_token = res?.register_token ?? '';

      if (!!register_token) {
        router.push(`/auth/signup?register_token=${register_token}`);
      } else {
        setStates(res?.login ?? null);
        router.push(`/profile`);
      }
    }

    function errorHandler(res: any) {
      Object.assign(dialog, {
        type: 'error',
        heading: 'Headings.UnableToOAuth',
        body: `${t('Error.UnableToOAuth')}: ${t(res?.detail ?? '')}`,
        primaryBtn: {
          label: 'Links.GoBack',
          onclick: () => {
            router.push('/auth/login');
          },
        },
        secondaryBtn: null,
      });
    }

    return { dialog };
  },
};
</script>

<style scoped></style>
