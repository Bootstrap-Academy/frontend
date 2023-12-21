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

✅ Display data
✅ Handle empty state
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
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'MFA Disabled',
  },
  setup() {
    const router = useRouter();

    const dialog = <any>reactive({
      type: 'warning',
      heading: 'Headings.DisabledMFAViaRecoveryCode',
      body: 'Body.DisabledMFAViaRecoveryCode',
      primaryBtn: {
        label: 'Buttons.Re-EnableMFA',
        onclick: () => {
          router.push('/account/mfa/initialize');
        },
      },
      secondaryBtn: null,
    });

    return { dialog };
  },
};
</script>

<style scoped></style>
