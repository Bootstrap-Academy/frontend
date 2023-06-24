<template>
  <div
    class="rounded-md h-full"
    :class="
      showInnerBorder
        ? 'px-1 py3 lg:px-2 lg:py-6 border border-light  overflow-y-scroll '
        : ''
    "
  >
    <SkeletonCodingChallengeList v-if="!!loading" />
    <p
      class="text-center h-full flex items-center justify-center"
      v-else-if="!codingChallenges.length"
    >
      {{ t("Headings.NoCodingChallengeCreated") }}
    </p>

    <CodingChallengeCard
      @click="solveCodingChallenge(codingChallenge.id)"
      v-else-if="codingChallenges.length"
      v-for="(codingChallenge, i) of codingChallenges"
      :codingChallenge="codingChallenge"
      :key="i"
      class="bg-primary border border-light rounded-md mb-4 p-2 group cursor-pointer"
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
    function solveCodingChallenge(id: any) {
      navigateTo(
        `/challenges/${baseQuery.value.category}/${props.taskId}?codingChallenge=${id}`
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
