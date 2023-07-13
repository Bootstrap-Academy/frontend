<template>
  <div
    class="rounded-md h-full px-1 py3 lg:px-2 lg:py-6 border border-light overflow-y-scroll"
    :class="showInnerBorder ? ' ' : ''"
  >
    <SkeletonCodingChallengeList v-if="!!loading" />
    <p
      class="text-center h-full flex items-center justify-center"
      v-else-if="!codingChallenges.length"
    >
      {{ t("Headings.NoCodingChallengeCreated") }}
    </p>

    <CodingChallengeCard
      @click="solveCodingChallenge(codingChallenge)"
      v-else-if="codingChallenges.length"
      v-for="(codingChallenge, i) of codingChallenges"
      :codingChallenge="codingChallenge"
      :key="i"
      class="bg-primary border border-light rounded-md mb-4 p-2 group cursor-pointer mt-1"
    >
    </CodingChallengeCard>
  </div>
</template>

<script lang="ts">
import { ArrowRightIcon, CheckIcon } from "@heroicons/vue/24/outline";
import { useAllCodingChallengesInATask } from "~~/composables/codingChallenges";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    id: { type: String, id: "" },
    showInnerBorder: { type: Boolean, id: false },
    taskId: { type: String, default: "" },
  },

  setup(props) {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();
    const codingChallenges = useAllCodingChallengesInATask();
    const loading = ref(true);
    const activeCodingChallenge = ref("");

    const baseQuery: any = computed(() => {
      return {
        category: route.query?.category ?? "",
      };
    });

    async function getcodingChallenges() {
      loading.value = true;
      await getAllCodingChallengesInATask(props?.id);
      loading.value = false;
    }

    function solveCodingChallenge(codingChallenge: any) {
      if (codingChallenge.solved) {
        return;
      }
      console.log("coding challenge", codingChallenge);
      const coins = useCoins();
      if (codingChallenge?.fee > 0 && coins.value < codingChallenge?.fee) {
        return openSnackbar("info", "Error.NoEnoughCoinsToSolve");
      }
      if (!codingChallenge.unlocked) {
        // openSnackbar("info", "Error.CodingChallengeLocked");
        openDialog(
          "info",
          "Headings.UnlockCodingChallenge",
          "Body.BuyCodingChallnge",
          false,
          {
            label: "Buttons.Buy",
            onclick: async () => {
              const [success, error] = await buySubtask(
                codingChallenge.task_id,
                codingChallenge.id
              );
              if (success) {
                navigateTo(
                  `/challenges/${baseQuery.value.category}/${props.taskId}?codingChallenge=${codingChallenge.id}`
                );
                openSnackbar("success", "Success.BuyCodingChallenge");
              } else openSnackbar("error", error);
            },
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
        return;
      }

      navigateTo(
        `/challenges/${baseQuery.value.category}/${props.taskId}?codingChallenge=${codingChallenge.id}`
      );
    }

    watch(
      () => props.id,
      async () => {
        if (!!props?.id) await getcodingChallenges();
      },
      { immediate: true }
    );
    onMounted(() => {
      if (!!props?.id) {
        getcodingChallenges();
      }
    });
    return { codingChallenges, loading, solveCodingChallenge, t };
  },
  components: { ArrowRightIcon, CheckIcon },
});
</script>

<style scoped></style>
