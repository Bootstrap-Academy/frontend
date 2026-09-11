<template>
  <NuxtLayout>
    <NuxtLoadingIndicator />
    <LazyClientOnly>
      <Confetti v-if="showConfetti" />
      <Loading v-if="!publicLegalPage" />
      <UpdateNotice :dismissed="updateNoticeDismissals" />
    </LazyClientOnly>
    <NuxtPage />

    <Modal v-if="!publicLegalPage && dialog && dialog.show" @backdrop="handleDialogOnBackdrop()">
      <Dialog :dialog="dialog" />
    </Modal>
    <Snackbar class="z-[999]" />

    <div v-if="!publicLegalPage && accessToken">
      <FormWebinarRating
        v-for="unratedWebinar of unratedWebinars"
        :key="unratedWebinar.id"
        :data="unratedWebinar"
        @done="ondoneRmWebinar($event)"
      />
    </div>
  </NuxtLayout>
  <LazyClientOnly><Footer /></LazyClientOnly>
</template>

<script lang="ts">
import type { Ref } from "vue";
import "highlight.js/styles/github-dark.css";
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css" integrity="sha384-vKruj+a13U8yHIkAyGgK1J3ArTLzrFGBbBc0tDp4ad/EyewESeXE/Iv67Aj8gKZ0" crossorigin="anonymous">

export default {
  setup() {
    // Layout slots can remount; the fallback must last for this App instance.
    const updateNoticeDismissals = new Set<string>();
    const dialog = useDialog();
    const showConfetti = useShowConfetti();
    function handleDialogOnBackdrop() {
      dialog.value &&
        dialog.value.triggerPrimaryActionOnBackdropClick &&
        dialog.value.primaryBtn.onclick &&
        dialog.value.primaryBtn.onclick();
    }

    // The session is restored from the cookies in `plugins/session.client.ts`,
    // which also loads the full profile of the logged in user.
    const accessToken = useAccessToken();
    const route = useRoute();
    const publicLegalPage = computed(() => isPublicLegalRoute(route.path));

    const nuxtApp = useNuxtApp();

    nuxtApp.hook("page:finish", async () => {
      if (!!accessToken.value && !isOnPublicLegalRoute()) {
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
      updateNoticeDismissals,
      dialog,
      handleDialogOnBackdrop,
      unratedWebinars,
      ondoneRmWebinar,
      showConfetti,
      accessToken,
      publicLegalPage,
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
