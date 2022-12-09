<template>
	<NuxtLayout>
		<NuxtLoadingIndicator />
		<client-only>
			<Loading />
		</client-only>
		<NuxtPage />

		<CookiePolicy v-if="isPageLoaded" />
		<Modal v-if="dialog && dialog.show" @backdrop="handleDialogOnBackdrop()">
			<Dialog :dialog="dialog" />
		</Modal>
		<Snackbar class="z-[999]" />

		<FormWebinarRating
			v-for="unratedWebinar of unratedWebinars"
			:key="unratedWebinar.id"
			:data="unratedWebinar"
			@done="ondoneRmWebinar($event)"
		/>
	</NuxtLayout>
</template>

<script lang="ts">
import { Ref } from 'vue';
export default {
	setup() {
		const dialog = useDialog();

		function handleDialogOnBackdrop() {
			dialog.value &&
				dialog.value.triggerPrimaryActionOnBackdropClick &&
				dialog.value.primaryBtn.onclick &&
				dialog.value.primaryBtn.onclick();
		}

		const user: Ref<any> = useUser();
		const cookie_user = useCookie('user');
		user.value = cookie_user.value ?? null;

		const session: Ref<any> = useSession();
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

		nuxtApp.hook('page:finish', async () => {
			isPageLoaded.value = true;
			if (!!accessToken.value) {
				await getUnratedWebinars();
			}
		});

		const unratedWebinars: Ref<any[]> = useUnratedWebinars();

		function ondoneRmWebinar(id: string) {
			let index = unratedWebinars.value.findIndex((web) => web.id == id);
			if (index < 0) return;
			unratedWebinars.value.splice(index, 1);
		}

		return {
			dialog,
			handleDialogOnBackdrop,
			isPageLoaded,
			unratedWebinars,
			ondoneRmWebinar,
		};
	},
};
</script>

<style>
/* .page-enter-active,
.page-leave-active {
	transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
	opacity: 0;
	filter: blur(1rem);
}
.layout-enter-active,
.layout-leave-active {
	transition: all 0.4s;
}
.layout-enter-from,
.layout-leave-to {
	opacity: 0;
	filter: blur(1rem);
} */
</style>
