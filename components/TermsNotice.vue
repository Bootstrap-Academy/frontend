<template>
  <aside
    v-if="view.visible && !waiting && announcement"
    :key="view.revision"
    class="container my-4 print:hidden"
    :aria-label="t('TermsNotice.Label')"
    data-terms-notice
  >
    <div class="border-accent/30 rounded-lg border bg-secondary p-4">
      <div class="flex flex-wrap items-center gap-3">
        <i18n-t keypath="TermsNotice.Body" tag="p" class="min-w-0 flex-1 basis-64" scope="global">
          <template #date>{{ german ? announcement.date : announcement.dateEn }}</template>
          <template #withdrawal>
            <NuxtLink
              class="underline"
              :to="german ? TERMS_NOTICE_WITHDRAWAL : TERMS_NOTICE_WITHDRAWAL_EN"
              >{{ t("TermsNotice.Withdrawal") }}</NuxtLink
            >
          </template>
          <template #changes>
            <NuxtLink class="underline" :to="TERMS_NOTICE_TERMS">{{
              t("TermsNotice.Changes")
            }}</NuxtLink>
          </template>
        </i18n-t>
        <Btn secondary v-on="{ click: view.dismiss }">{{ t("UpdateNotice.Dismiss") }}</Btn>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes";
import {
  isOrderRoute,
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
      !isOrderRoute(route.path)
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
