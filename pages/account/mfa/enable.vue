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
✅ Form Client Side Error Handling
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
	<section
		class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
	>
		<Transition mode="out-in" name="slide-up-down">
			<Dialog v-if="recovery_code" :dialog="dialog">
				<template #content>
					<p class="text-body-1 text-body font-body m-0 mt-card">
						{{ t('Body.WantToDisable') }}
						<a href="/account" class="underline-link w-fit">
							{{ accountLink }}
						</a>
					</p>
					<p class="text-body-1 text-body font-body m-0 mt-card">
						{{ t('Inputs.RecoveryCode') }}:
						<span class="allow-selection text-heading">
							{{ recovery_code }}
						</span>
					</p>
				</template>
			</Dialog>

			<section class="container-form" v-else>
				<SectionTitle
					center
					heading="Headings.EnableMFA"
					body="Body.EnableMFACode"
					size="sm"
					class="mb-card"
				/>
				<FormEnableMFA @recovery_code="recovery_code = $event" />
			</section>
		</Transition>
	</section>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Enable MFA',
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();

    const dialog = reactive({
      type: 'success',
      heading: 'Success.EnabledMFA',
      body: 'Success.EnableMFACode',
      primaryBtn: {
        label: 'Buttons.Okay',
        onclick: () => {
          router.push('/auth/login');
        },
      },
      secondaryBtn: null,
    });

    const recovery_code = ref('');

    const config = useRuntimeConfig().public;
    const accountLink = computed(() => {
      return `${config.BASE_WEB_URL}/account`;
    });

    return { t, dialog, recovery_code, accountLink };
  },
};
</script>

<style scoped></style>
