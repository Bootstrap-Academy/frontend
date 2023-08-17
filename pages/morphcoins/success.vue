<template>
  <section
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <Transition mode="out-in" name="slide-up-down">
      <Dialog v-if="dialog && dialog.type" :dialog="dialog">
        <template #content>
          <p>
            {{ t("Headings.Purchased") }}:
            <span class="text-heading">
              {{ coinsToBuy }}
              {{ t("Headings.Morphcoins").toLocaleLowerCase() }}
              {{ t("Headings.For").toLocaleLowerCase() }}
              {{ coinsToBuy / 100 }}
              {{ t("Headings.Euros").toLocaleLowerCase() }}
            </span>
          </p>
          <p>
            {{ t("Headings.TotalMorphcoins") }}:
            <span class="font-bold text-accent">
              {{ coins }} {{ t("Headings.Morphcoins") }}
            </span>
          </p>
        </template>
      </Dialog>
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
    title: "Success - Buy Coins",
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    const coins = useCoins();

    const coinsToBuy = computed(() => {
      return parseInt(<string>(route?.query?.coins ?? "0"));
    });

    const dialog = <any>reactive({
      type: "success",
      heading: "Success.Success",
      body: "Success.BuyCoins",
      primaryBtn: {
        label: "Buttons.Okay",
        onclick: () => {
          router.push("/morphcoins/buy");
        },
      },
      secondaryBtn: null,
    });

    return { t, dialog, coinsToBuy, coins };
  },
};
</script>

<style scoped></style>
