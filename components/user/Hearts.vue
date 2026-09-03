<!--
  The heart counter in the navigation bar. The API counts half hearts
  (`hearts_max` is 6), the interface shows whole hearts drawn in halves, which
  is the unit the terms and conditions use: three hearts, half a heart per quiz
  or matching attempt, one heart per coding challenge.
-->
<template>
  <div class="group flex items-center gap-2" @click="gotoSubscription()">
    <div v-if="!isPremmium" class="text-heading hover:text-white">
      <article class="flex h-10 items-center gap-1 rounded-full bg-tertiary px-5 py-2">
        <template v-for="slot of slots" :key="slot">
          <SvgFullHeart v-if="hearts >= slot * 2" :color="'accent'" class="h-3 w-3 sm:h-5 sm:w-5" />
          <SvgHalfHeart
            v-else-if="hearts === slot * 2 - 1"
            :color="'accent'"
            class="h-3 w-3 sm:h-5 sm:w-5"
          />
          <OutlineHeartIcon v-else class="h-4 w-4 text-accent sm:h-6 sm:w-6" />
        </template>

        <PlusIcon class="text-headiacang ml-1 block h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
      </article>
    </div>
    <div
      v-else-if="isPremmium"
      class="flex items-center justify-between gap-1 rounded-full bg-light px-3 py-1"
    >
      <SolidHeartIcon class="h-7 w-7 text-[#FFD700]" />
      <span class="-mt-1 text-lg text-[#FFD700]"> ∞ </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon } from "@heroicons/vue/24/outline";
import { HeartIcon as SolidHeartIcon } from "@heroicons/vue/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/vue/24/outline";
import { useHeartInfo } from "~~/composables/hearts";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon, SolidHeartIcon, OutlineHeartIcon },
  setup() {
    const loading = ref(true);
    const heartInfo: any = useHeartInfo();
    const premiumInfo: any = usePremiumInfo();
    const heartConfig = useHeartConfig();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const isPremmium = computed(() => {
      return premiumInfo.value?.premium ?? false;
    });

    // One entry per whole heart, so the row always shows how many are missing.
    const slots = computed(() =>
      Array.from({ length: heartSlots(heartConfig.value) }, (_, index) => index + 1)
    );

    function gotoSubscription() {
      const router = useRouter();
      router.push("/subscription");
    }

    onMounted(async () => {
      await Promise.all([getHearts(), getPremiumStatus(), loadHeartConfig()]);
      loading.value = false;
    });

    return {
      loading,
      hearts,
      slots,
      gotoSubscription,
      isPremmium,
      OutlineHeartIcon,
      SolidHeartIcon,
    };
  },
});
</script>

<style scoped></style>
