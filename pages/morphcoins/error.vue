<template>
  <section
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <Transition mode="out-in" name="slide-up-down">
      <Dialog v-if="dialog && dialog.type" :dialog="dialog" />
    </Transition>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Error - Buy Coins",
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    const errorMsg = computed(() => {
      return route?.query?.msg ?? "";
    });

    const dialog = <any>reactive({
      type: "error",
      heading: "Error.Error",
      body: `${t("Error.BuyCoins")}: ${errorMsg.value}`,
      primaryBtn: {
        label: "Buttons.TryAgain",
        onclick: () => {
          router.push("/morphcoins/buy");
        },
      },
      secondaryBtn: null,
    });

    return { dialog };
  },
};
</script>

<style scoped></style>
