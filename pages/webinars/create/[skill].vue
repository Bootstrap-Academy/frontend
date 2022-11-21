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
	>
		<section class="container-form max-w-3xl">
			<SectionTitle
				center
				heading="Headings.CreateWebinar"
				size="sm"
				class="mb-card mx-auto"
			/>
			<FormWebinar :data="user" />
		</section>
	</section>
</template>

<script lang="ts">
definePageMeta({
	layout: 'inner',
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Manage Webinar',
	},
	setup() {
		const user = useUser();

		return { user };
	},
};
</script>

<style scoped></style>
