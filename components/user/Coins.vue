<template>
  <NuxtLink to="/morphcoins/buy">
    <article
      class="flex items-center w-fit min-w-fit cursor-pointer"
      :class="sm ? 'p-1' : 'p-2 bg-tertiary rounded-3xl'"
    >
      <img
        src="/images/coin.png"
        alt="coin"
        class="object-contain h-4 w-4 sm:w-5 sm:h-5"
      />
      <p class="font-heading text-heading ml-2.5 mr-2 text-body-1">
        {{ loading ? "" : abbreviateNumber(coins) }}
      </p>
      <PlusIcon
        class="flex-shrink-0 text-heading block h-3 w-3 sm:w-4 sm:h-4"
      />
    </article>
  </NuxtLink>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon },
  setup() {
    const coins = useCoins();
    const loading = ref(true);

    onMounted(async () => {
      await getBalance();
      loading.value = false;
    });

    return { coins, loading };
  },
});
</script>

<style scoped></style>
