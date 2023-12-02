<template>
  <div class="flex items-center gap-2 group" @click="gotoSubscription()">
    <div v-if="!isPremmium" class="text-heading hover:text-white">
      <article
        class="flex items-center gap-1 bg-tertiary px-5 py-2 h-10 rounded-full"
      >
        <!-- <HeartIcon
          class="flex-shrink-0 text-accent block w-4 h-4 group-hover:animate-pulse group-hover:scale-105"
        />{{ hearts / 2 ?? "" }} -->

        <SvgFullHeart
          :color="'accent'"
          class="h-3 w-3 sm:h-5 sm:w-5"
          v-if="hearts >= 2"
        />
        <SvgFullHeart
          :color="'accent'"
          class="h-3 w-3 sm:h-5 sm:w-5"
          v-if="hearts >= 4"
        />
        <SvgFullHeart
          :color="'accent'"
          class="h-3 w-3 sm:h-5 sm:w-5"
          v-if="hearts >= 6"
        />
        <SvgHalfHeart
          :color="'accent'"
          class="h-3 w-3 sm:h-5 sm:w-5"
          v-if="hearts == 3 || hearts == 5 || hearts == 1"
        />

        <OutlineHeartIcon v-if="hearts == 0" class="h-6 w-6 text-accent" />

        <PlusIcon
          class="flex-shrink-0 text-headiacang block h-3 w-3 sm:w-3.5 sm:h-3.5 ml-1"
        />
      </article>
    </div>
    <div
      v-else-if="isPremmium"
      class="bg-light rounded-full px-3 py-1 flex justify-between items-center gap-1"
    >
      <SolidHeartIcon class="h-7 w-7 text-[#FFD700]" />
      <span class="text-[#FFD700] -mt-1 text-lg"> ∞ </span>
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
