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

✅ Preset Form
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
		<section class="container-form max-w-3xl">
			<SectionTitle
				center
				heading="Headings.EditProfile"
				size="sm"
				class="mb-card mx-auto"
			/>
			<FormProfile :data="user" />
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
    title: 'Edit Profile',
  },
  setup() {
    const user = useUser();

    onMounted(async () => {
      if (!hasEmail.value) {
        openDialog(
          'warning',
          'Headings.MissingEmail',
          'Body.MissingEmail',
          true,
          {
            label: 'Buttons.Okay',
            onclick: () => {},
          },
          null
        );
      }
    });

    return { user };
  },
};
</script>

<style scoped></style>
