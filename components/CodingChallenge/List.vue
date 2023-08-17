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

    <div
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
      v-else-if="codingChallenges.length"
    >
      <CodingChallengeCard
        @click="solveCodingChallenge(codingChallenge)"
        v-for="(codingChallenge, i) of codingChallenges"
        :codingChallenge="codingChallenge"
        :key="i"
        class="border border-light rounded-md"
      >
      </CodingChallengeCard>
    </div>
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
    const hearts: any = useHearts();

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
      console.log("coding challenge", codingChallenge);
      const isPremium: any = useIsPremium();
      if (!isPremium.value && hearts.value?.hearts < 1) {
        return openSnackbar("info", "Error.NotEnoughHearts");
      } else if (!!!isPremium.value.premium && hearts.value?.hearts >= 1) {
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
      } else if (isPremium.value) {
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
