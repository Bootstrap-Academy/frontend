<template>
  <div
    class="py3 h-full overflow-y-scroll rounded-md border border-light px-1 lg:px-2 lg:py-6"
    :class="showInnerBorder ? ' ' : ''"
  >
    <SkeletonCodingChallengeList v-if="!!loading" />
    <p
      class="flex h-full items-center justify-center text-center"
      v-else-if="!codingChallenges.length"
    >
      {{ t("Headings.NoCodingChallengeCreated") }}
    </p>

    <template v-else-if="codingChallenges.length">
      <!-- Without a heart a task stays closed; the way forward stands above the tasks. -->
      <div v-if="heartsEmpty" ref="heartsBlock" class="mx-auto mb-4 max-w-md px-2 pt-2">
        <UserHeartsEmpty />
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CodingChallengeCard
          @click="solveCodingChallenge(codingChallenge)"
          v-for="(codingChallenge, i) of codingChallenges"
          :codingChallenge="codingChallenge"
          :key="i"
          class="rounded-md border border-light"
        >
        </CodingChallengeCard>
      </div>
    </template>
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
    const route = useRoute();
    const codingChallenges = useAllCodingChallengesInATask();
    const loading = ref(true);
    const { isDaily } = useDailyLearning();
    const { heartsEmpty, reportNoHearts } = useHeartsEmpty();
    const heartsBlock = ref<HTMLElement | null>(null);
    const heartInfo: any = useHeartInfo();
    const premiumInfo: any = usePremiumInfo();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const isPremium = computed(() => {
      return premiumInfo.value?.premium ?? false;
    });
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

    async function solveCodingChallenge(codingChallenge: any) {
      if (!isDaily.value && !isPremium.value && hearts.value < 2) {
        reportNoHearts();
        await nextTick();
        heartsBlock.value?.scrollIntoView({ block: "nearest" });
        return;
      } else if (isDaily.value || isPremium.value || hearts.value >= 2) {
        navigateTo(
          `/challenges/${baseQuery.value.category}/${props.taskId}?codingChallenge=${codingChallenge.id}`
        );
        // if (!isPremium.value)
        //   return openSnackbar("info", "Body.BuyCodingChallnge");
      }
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
    return { codingChallenges, loading, solveCodingChallenge, heartsEmpty, heartsBlock, t };
  },
  components: { ArrowRightIcon, CheckIcon },
});
</script>

<style scoped></style>
