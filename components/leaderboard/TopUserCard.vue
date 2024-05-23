<template>
  <div
    class="border border-light rounded-md w-[220px] max-w-[320px] flex flex-col items-center px-6 py-10 relative hover:-translate-y-2 transition-all duration-300"
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

    <p class="text-2xl text-accent text-center my-1 break-words">
      {{ user?.user?.display_name.split()[0] ?? "" }}
    </p>
    <p class="text-sm">{{ t("Headings.Score") }} {{ user?.score }}</p>
    <SvgLevel1Icon
      v-if="user?.rank == 1"
      class="absolute top-1 right-0 h-8 w-8"
    />
    <SvgLevel2Icon
      v-if="user?.rank == 2"
      class="absolute top-1 right-0 h-8 w-8"
    />
    <SvgLevel3Icon
      v-if="user?.rank == 3"
      class="absolute top-1 right-0 h-8 w-8"
    />
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
