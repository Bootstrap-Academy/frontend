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
	<main class="container grid gap-container mt-main mb-main">
		<AccountVerifyEmail />
		<AccountNewsletter />
		<AccountMFA />
		<AccountChangePassword />
		<AccountDelete />
	</main>
</template>

<script lang="ts">
definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Account Settings',
	},
	setup() {
		return {};
	},
};
</script>

<style scoped></style>
