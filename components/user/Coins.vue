<template>
  <NuxtLink to="/morphcoins/buy">
    <article
      class="flex h-10 w-fit min-w-fit cursor-pointer items-center px-5 py-2"
      :class="sm ? 'p-1' : 'rounded-3xl bg-tertiary p-2'"
    >
      <img
        src="/images/coin.png"
        :alt="t('AltAttributes.Morphcoin')"
        class="h-4 w-4 object-contain sm:h-5 sm:w-5"
      />
      <p class="text-body-1 ml-2.5 mr-2 text-heading font-heading">
        {{ loading ? "" : abbreviateNumber(coins) }}
      </p>
      <PlusIcon class="block h-3 w-3 flex-shrink-0 text-heading sm:h-4 sm:w-4" />
    </article>
  </NuxtLink>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon },
  setup() {
    const { t } = useI18n();

    const coins = useCoins();
    const loading = ref(true);

    onMounted(async () => {
      await getBalance();
      loading.value = false;
    });

    return { t, coins, loading };
  },
});
</script>

<style scoped></style>
