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

✅ Recaptcha
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
			<Dialog v-if="isSuccess" :dialog="dialog" />

			<section class="container-form" v-else>
				<SectionTitle
					center
					heading="Headings.DisableMFA"
					body="Body.EnableMFACode"
					size="sm"
					class="mb-card"
				/>
				<FormDisableMFA @isSuccess="isSuccess = $event" />
			</section>
		</Transition>
	</section>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Disable MFA',
  },
  setup() {
    const router = useRouter();

    const dialog = reactive({
      type: 'success',
      heading: 'Headings.DisableMFA',
      body: 'Success.DisabledMFA',
      primaryBtn: {
        label: 'Buttons.Okay',
        onclick: () => {
          router.push('/auth/login');
        },
      },
      secondaryBtn: null,
    });

    const isSuccess = ref(null);

    return { dialog, isSuccess };
  },
};
</script>

<style scoped></style>
