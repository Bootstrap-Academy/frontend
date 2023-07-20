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
		title: 'EduMatch',
	},
	setup() {
		const router = useRouter();
		const route = useRoute();

		const eduMatchLoginUrl = useEduMatchLoginUrl();
		const config = useRuntimeConfig();

		onMounted(async () => {
			setLoading(true);
			const [success, error] = await getEduMatchLoginUrl();
			setLoading(false);

			if (success) {
				window.location.replace(eduMatchLoginUrl.value);
			} else
				setTimeout(() => {
					openDialog(
						'info',
						'Links.EduMatch',
						'Body.EduMatch',
						false,
						{
							label: 'Buttons.Okay',
							onclick: () => {
								router.replace('/auth/login?redirect=/edumatch');
							},
						},
						{
							label: 'Buttons.Cancel',
							onclick: () => {},
						}
					);
				}, 0);
		});

		return {};
	},
};
</script>

<style scoped></style>
