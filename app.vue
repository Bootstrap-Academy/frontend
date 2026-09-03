<template>
  <NuxtLayout>
    <NuxtLoadingIndicator />
    <LazyClientOnly>
      <Confetti v-if="showConfetti" />
      <Loading />
    </LazyClientOnly>
    <NuxtPage />

    <!--
      § 312k Abs. 2 BGB (cancellation) and § 356a BGB (withdrawal) require a
      permanently available button. Rendered here, inside `<NuxtLayout>` and
      right after the page, it lands in the slot of every layout - `default`,
      `inner`, `empty` and `errorLayout` alike - and therefore appears on
      every route.
    -->
    <ContractTermination />

    <!--
      AGB 20.2: a new version of the terms is presented at the next login.
      Rendered here for the same reason as the bar above - it lands in the slot
      of every layout and therefore covers every route.
    -->
    <TermsGate />

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

    // The session is restored from the cookies in `plugins/session.client.ts`,
    // which also loads the full profile of the logged in user.
    const accessToken = useAccessToken();

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
