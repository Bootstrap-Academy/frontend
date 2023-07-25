<template>
  <div
    class="border border-light rounded-md min-w-[180px] flex flex-col items-center px-6 py-10 relative hover:-translate-y-2 transition-all duration-300"
  >
    <img
      class="h-20 w-20 rounded-full object-cover"
      :src="user.img ?? ''"
      alt="image not found."
    />
    <p class="text-2xl text-accent text-center my-2">{{ user.username }}</p>
    <p class="text-sm">{{ t("Headings.XP") }}: {{ user.xp }}</p>
    <SvgLevel1Icon
      v-if="user.rank == 1"
      class="absolute top-1 right-0 h-8 w-8"
    />
    <SvgLevel2Icon
      v-if="user.rank == 2"
      class="absolute top-1 right-0 h-8 w-8"
    />
    <SvgLevel3Icon
      v-if="user.rank == 3"
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
