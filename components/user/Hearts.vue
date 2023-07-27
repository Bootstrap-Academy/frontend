<template>
  <div class="flex items-center gap-2 group" @click="filHearts()">
    <div class="text-heading hover:text-white">
      <article
        class="flex items-center gap-0.5 bg-tertiary px-3 py-0.5 rounded-full"
      >
        <HeartIcon
          class="flex-shrink-0 text-accent block w-4 h-4 group-hover:animate-pulse group-hover:scale-105"
        />{{ hearts }}
        <PlusIcon class="flex-shrink-0 text-headiacang block w-3.5 h-3.5" />
      </article>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon, HeartIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon, HeartIcon },
  setup() {
    const coins = useCoins();
    const loading = ref(true);
    const hearts = ref(2.5);

    function filHearts() {
      if (hearts.value >= 3) openSnackbar("error", "Error.AlreadyHaveHearts");
      else if (coins.value < 50)
        openSnackbar("error", "Error.Need50CoinsForRefill");
      else if (hearts.value < 3) {
        openDialog(
          "info",
          `Headings.RefillHearts`,
          hearts.value == 0
            ? "Body.Refill3Hearts"
            : "" || hearts.value == 0.5
            ? "Body.Refill2p5Hearts"
            : "" || hearts.value == 1
            ? "Body.Refill2Hearts"
            : "" || hearts.value == 1.5
            ? "Body.Refill1p5Hearts"
            : "" || hearts.value == 2
            ? "Body.Refill1Hearts"
            : "" || hearts.value == 2.5
            ? "Body.Refill0p5Hearts"
            : "",
          false,
          {
            label: "Buttons.Refill",
            onclick: () => {},
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
      }
    }

    onMounted(async () => {
      await getBalance();
      loading.value = false;
    });

    return { coins, loading, filHearts, hearts };
  },
});
</script>

<style scoped></style>
