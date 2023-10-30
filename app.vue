<template>
  <NuxtLayout>
    <NuxtLoadingIndicator />
    <LazyClientOnly>
      <Confetti v-if="showConfetti" />
      <Loading />
    </LazyClientOnly>
    <NuxtPage />

    <CookiePolicy />
    <Modal v-if="dialog && dialog.show" @backdrop="handleDialogOnBackdrop()">
      <Dialog :dialog="dialog" />
    </Modal>
    <Snackbar class="z-[999]" />

    <div>
      <FormWebinarRating
        v-for="unratedWebinar of unratedWebinars"
        :key="unratedWebinar.id"
        :data="unratedWebinar"
        @done="ondoneRmWebinar($event)"
      />
    </div>
  </NuxtLayout>
</template>

<script lang="ts">
import type { Ref } from "vue";
import "highlight.js/styles/github-dark.css";
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css" integrity="sha384-vKruj+a13U8yHIkAyGgK1J3ArTLzrFGBbBc0tDp4ad/EyewESeXE/Iv67Aj8gKZ0" crossorigin="anonymous">

export default {
  setup() {
    const dialog = useDialog();
    const showConfetti = useShowConfetti();
    function handleDialogOnBackdrop() {
      dialog.value &&
        dialog.value.triggerPrimaryActionOnBackdropClick &&
        dialog.value.primaryBtn.onclick &&
        dialog.value.primaryBtn.onclick();
    }

    const user: Ref<any> = useUser();
    const cookie_user = useCookie("user");
    user.value = cookie_user.value ?? null;

    const session: Ref<any> = useSession();
    const cookie_session = useCookie("session");
    session.value = cookie_session.value ?? null;

    const accessToken = useAccessToken();
    const cookie_accessToken = useCookie("accessToken");
    accessToken.value = cookie_accessToken.value ?? "";

    const refreshToken = useRefreshToken();
    const cookie_refreshToken = useCookie("refreshToken");
    refreshToken.value = cookie_refreshToken.value ?? "";

    const nuxtApp = useNuxtApp();

    nuxtApp.hook("page:finish", async () => {
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
      unratedWebinars,
      ondoneRmWebinar,
      showConfetti,
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
