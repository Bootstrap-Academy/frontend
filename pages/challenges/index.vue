<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
❌ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Recaptcha
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<section
		class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
	></section>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'Challenges',
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const config = useRuntimeConfig().public;

    onMounted(async () => {
      router.replace('/challenges/all');
    });

    return {};
  },
};
</script>

<style scoped></style>
