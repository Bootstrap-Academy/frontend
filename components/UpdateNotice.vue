<template>
  <aside
    v-if="view.visible"
    :key="view.revision"
    class="container my-4 print:hidden"
    :aria-label="t('Links.Privacy')"
    data-update-notice
  >
    <div class="border-accent/30 rounded-lg border bg-secondary p-4">
      <div class="flex flex-wrap items-center gap-3">
        <p class="min-w-0 flex-1 basis-64">{{ t("UpdateNotice.Body") }}</p>
        <NuxtLink class="inline-flex min-h-11 items-center underline" :to="UPDATE_NOTICE_LINK">
          {{ t("UpdateNotice.Link") }}
        </NuxtLink>
        <Btn secondary v-on="{ click: view.dismiss }">{{ t("UpdateNotice.Dismiss") }}</Btn>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes";
import {
  createUpdateNotice,
  UPDATE_NOTICE_LINK,
  updateNoticeSubject,
  type UpdateNoticeView,
} from "../composables/updateNotice";

const props = defineProps<{ dismissed: Set<string> }>();
const { t } = useI18n();
const user = useUser();
const accessToken = useAccessToken();
const loaded = useProfileLoaded();
const route = useRoute();
const ready = ref(false);
let expiryCheck: ReturnType<typeof setInterval> | undefined;
const view = shallowRef<UpdateNoticeView>({ visible: false, revision: 0, dismiss: () => {} });
const notice = createUpdateNotice({
  dismissed: props.dismissed,
  storage: () => window.localStorage,
  changed: (value) => (view.value = value),
});

watch(
  () =>
    ready.value && !isPublicLegalRoute(route.path)
      ? updateNoticeSubject(user.value?.id, accessToken.value, loaded.value)
      : null,
  (subject) => notice.select(subject),
  { immediate: true, flush: "sync" }
);

function storageChanged(event: StorageEvent) {
  try {
    if (event.storageArea === window.localStorage) notice.storageChanged(event.key, event.newValue);
  } catch {
    // Access to localStorage itself can be disabled by the browser.
  }
}

onMounted(() => {
  window.addEventListener("storage", storageChanged);
  ready.value = true;
  expiryCheck = setInterval(() => notice.refresh(), 60_000);
});
onBeforeUnmount(() => {
  clearInterval(expiryCheck);
  notice.dispose();
  window.removeEventListener("storage", storageChanged);
});
</script>
