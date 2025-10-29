<template>
  <div
    class="relative flex w-[220px] max-w-[320px] flex-col items-center rounded-md border border-light px-6 py-10 transition-all duration-300 hover:-translate-y-2"
  >
    <img
      class="h-20 w-20 rounded-full object-cover"
      :src="user?.user?.avatar_url ?? '/images/user1.jpg'"
      :alt="t('AltAttributes.UserAvatar')"
    />
    <p class="mt-1">
      {{ user?.rank }}<span v-if="user?.rank == 1">st </span>
      <span v-if="user?.rank == 2">nd </span>
      <span v-if="user?.rank == 3">rd </span>
    </p>

    <p class="my-1 break-words text-center text-2xl text-accent">
      {{ user?.user?.display_name.split()[0] ?? "" }}
    </p>
    <p class="text-sm">{{ t("Headings.Score") }} {{ user?.score }}</p>
    <SvgLevel1Icon v-if="user?.rank == 1" class="absolute right-0 top-1 h-8 w-8" />
    <SvgLevel2Icon v-if="user?.rank == 2" class="absolute right-0 top-1 h-8 w-8" />
    <SvgLevel3Icon v-if="user?.rank == 3" class="absolute right-0 top-1 h-8 w-8" />
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  props: {
    user: { type: Object, default: null },
  },
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>

<style scoped></style>
