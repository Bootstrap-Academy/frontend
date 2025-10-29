<template>
  <div class="group flex items-center gap-2" @click="gotoSubscription()">
    <div v-if="!isPremmium" class="text-heading hover:text-white">
      <article class="flex h-10 items-center gap-1 rounded-full bg-tertiary px-5 py-2">
        <!-- <HeartIcon
          class="flex-shrink-0 text-accent block w-4 h-4 group-hover:animate-pulse group-hover:scale-105"
        />{{ hearts / 2 ?? "" }} -->

        <SvgFullHeart :color="'accent'" class="h-3 w-3 sm:h-5 sm:w-5" v-if="hearts >= 2" />
        <SvgFullHeart :color="'accent'" class="h-3 w-3 sm:h-5 sm:w-5" v-if="hearts >= 4" />
        <SvgFullHeart :color="'accent'" class="h-3 w-3 sm:h-5 sm:w-5" v-if="hearts >= 6" />
        <SvgHalfHeart
          :color="'accent'"
          class="h-3 w-3 sm:h-5 sm:w-5"
          v-if="hearts == 3 || hearts == 5 || hearts == 1"
        />

        <OutlineHeartIcon v-if="hearts == 0" class="h-6 w-6 text-accent" />

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
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const isPremmium = computed(() => {
      return premiumInfo.value?.premium ?? false;
    });

    function gotoSubscription() {
      const router = useRouter();
      router.push("/subscription");
    }

    onMounted(async () => {
      await getHearts();
      await getPremiumStatus();
      loading.value = false;
    });

    return {
      loading,
      hearts,
      gotoSubscription,
      isPremmium,
      OutlineHeartIcon,
      SolidHeartIcon,
    };
  },
});
</script>

<style scoped></style>
