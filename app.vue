<template>
	<NuxtLayout>
		<NuxtLoadingIndicator />
		<NuxtPage />

		<CookiePolicy v-if="isPageLoaded" />
		<Modal v-if="dialog && dialog.show" @backdrop="handleDialogOnBackdrop()">
			<Dialog :dialog="dialog" />
		</Modal>
		<Snackbar />
		<Loading />
	</NuxtLayout>
</template>

<script>
export default {
	setup() {
		const dialog = useDialog();

		function handleDialogOnBackdrop() {
			dialog.value &&
				dialog.value.triggerPrimaryActionOnBackdropClick &&
				dialog.value.primaryBtn.onclick &&
				dialog.value.primaryBtn.onclick();
		}

		const user = useUser();
		const cookie_user = useCookie('user');
		user.value = cookie_user.value ?? null;

		const session = useSession();
		const cookie_session = useCookie('session');
		session.value = cookie_session.value ?? null;

		const accessToken = useAccessToken();
		const cookie_accessToken = useCookie('accessToken');
		accessToken.value = cookie_accessToken.value ?? '';

		const refreshToken = useRefreshToken();
		const cookie_refreshToken = useCookie('refreshToken');
		refreshToken.value = cookie_refreshToken.value ?? '';

		const isPageLoaded = ref(false);
		const nuxtApp = useNuxtApp();

		nuxtApp.hook('page:finish', () => {
			isPageLoaded.value = true;
		});

		return { dialog, handleDialogOnBackdrop, isPageLoaded };
	},
};
</script>
