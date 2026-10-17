<template>
  <aside
    v-if="view.visible && !waiting && announcement"
    :key="view.revision"
    class="container my-2 print:hidden"
    :aria-label="t('TermsNotice.Label')"
    data-terms-notice
  >
    <!-- Small on purpose: the mail explains the change, this only points to it. -->
    <div class="border-accent/30 relative rounded-lg border bg-secondary p-3 pr-12">
      <i18n-t keypath="TermsNotice.Body" tag="p" class="text-body-2 m-0" scope="global">
        <template #date>{{ german ? announcement.date : announcement.dateEn }}</template>
        <!-- The links take the size and font of the sentence; links elsewhere are larger. -->
        <template #withdrawal>
          <NuxtLink
            class="text-accent underline underline-offset-2 [font:inherit]"
            :to="german ? TERMS_NOTICE_WITHDRAWAL : TERMS_NOTICE_WITHDRAWAL_EN"
            >{{ t("TermsNotice.Withdrawal") }}</NuxtLink
          >
        </template>
        <template #changes>
          <NuxtLink
            class="text-accent underline underline-offset-2 [font:inherit]"
            :to="TERMS_NOTICE_TERMS"
            >{{ t("TermsNotice.Changes") }}</NuxtLink
          >
        </template>
      </i18n-t>
      <button
        type="button"
        class="absolute right-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg text-xl leading-none text-heading hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        :aria-label="t('UpdateNotice.Dismiss')"
        data-terms-notice-close
        @click="view.dismiss()"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes";
import {
  isGoalRoute,
  termsNotice,
  TERMS_NOTICE_TERMS,
  TERMS_NOTICE_WITHDRAWAL,
  TERMS_NOTICE_WITHDRAWAL_EN,
} from "../composables/termsNotice";
import {
  createUpdateNotice,
  isSessionEntryRoute,
  updateNoticeSubject,
  type UpdateNoticeView,
} from "../composables/updateNotice";

// `waiting`: another notice is on screen, and this one follows once that is closed.
const props = defineProps<{ dismissed: Set<string>; waiting: boolean }>();
const { t, locale } = useI18n();
const german = computed(() => locale.value === "de");
const user = useUser();
const accessToken = useAccessToken();
const loaded = useProfileLoaded();
const route = useRoute();
const ready = ref(false);
let expiryCheck: ReturnType<typeof setInterval> | undefined;
const announcement = termsNotice(useRuntimeConfig().public);
const view = shallowRef<UpdateNoticeView>({ visible: false, revision: 0, dismiss: () => {} });
const notice =
  announcement &&
  createUpdateNotice({
    dismissed: props.dismissed,
    storage: () => window.localStorage,
    changed: (value) => (view.value = value),
    window: announcement.window,
  });

if (notice)
  watch(
    () =>
      ready.value &&
      !isPublicLegalRoute(route.path) &&
      !isSessionEntryRoute(route.path) &&
      !isGoalRoute(route.path)
        ? updateNoticeSubject(user.value?.id, accessToken.value, loaded.value)
        : null,
    (subject) => notice.select(subject),
    { immediate: true, flush: "sync" }
  );

function storageChanged(event: StorageEvent) {
  try {
    if (event.storageArea === window.localStorage)
      notice?.storageChanged(event.key, event.newValue);
  } catch {
    // Access to localStorage itself can be disabled by the browser.
  }
}

onMounted(() => {
  if (!notice) return;
  window.addEventListener("storage", storageChanged);
  ready.value = true;
  expiryCheck = setInterval(() => notice.refresh(), 60_000);
});
onBeforeUnmount(() => {
  if (!notice) return;
  clearInterval(expiryCheck);
  notice.dispose();
  window.removeEventListener("storage", storageChanged);
});
</script>
