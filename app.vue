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
  </NuxtLayout>
  <LazyClientOnly>
    <Footer />
    <FeedbackLauncher />
  </LazyClientOnly>
</template>

<script lang="ts">
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
    const route = useRoute();
    const publicLegalPage = computed(() => isPublicLegalRoute(route.path));

    return {
      updateNoticeDismissals,
      dialog,
      handleDialogOnBackdrop,
      showConfetti,
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
