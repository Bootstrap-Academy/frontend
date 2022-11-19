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
	setup() {
		return {};
	},
};
</script>

<style scoped></style>
