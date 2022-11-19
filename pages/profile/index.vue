<!--  
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari

❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main
		ref="aos"
		class="container-fluid pb-container mt-main grid gap-container grid-cols-1 lg:grid-cols-[275px_1fr] xl:grid-cols-[350px_1fr]"
	>
		<UserProfile
			:data="user"
			class="lg:row-span-4 lg:sticky lg:top-container lg:self-start"
		/>

		<UserProgress />

		<UserCourses />
	</main>
</template>

<script lang="ts">
definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'My Profile',
	},
	setup() {
		const user = useUser();

		const aos = ref<HTMLDivElement | null>(null);

		onMounted(() => {
			setAOSViaParent(aos.value, 'aos', 'show', []);
		});

		return { user, aos };
	},
};
</script>

<style scoped></style>
