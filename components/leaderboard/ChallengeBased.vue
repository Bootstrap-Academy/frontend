<template>
  <div class="px-7">
    <SkeletonLeaderBoardChallenges v-if="loading" />
    <section
      v-else-if="!loading && allGlobalChallenges.length"
      @click="fnOpenDialog(challenge.id)"
      class="group my-3 flex cursor-pointer flex-col items-start justify-between gap-4 rounded-md border border-accent p-3 transition-all hover:scale-105 sm:flex-row sm:items-center sm:p-5"
      v-for="(challenge, i) of allGlobalChallenges"
      :key="i"
    >
      <p class="clamp tight text-white">
        {{ challenge?.description ?? "" }}
      </p>
      <ArrowRightIcon class="h-7 w-7 scale-75 text-white transition-all group-hover:scale-100" />
    </section>

    <section v-else-if="!allGlobalChallenges.length && !loading">
      <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
    </section>

    <DialogSlot
      v-if="dialogLeaderBoardChallengeBased"
      :label="'Headings.LeaderBoard'"
      :propClass="'modal-width-lg lg:modal-width-md shadow '"
      :show="dialogSlot"
      @closeFunction="dialogLeaderBoardChallengeBased = false"
    >
      <LeaderboardChallengeBasedListDialog :challengeId="challengeId" />
    </DialogSlot>
  </div>
</template>

<script lang="ts">
import { ArrowRightIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";

export default {
  props: { leaderBoardList: { type: Array, default: [] } },
  setup() {
    const { t } = useI18n();
    const dialogLeaderBoardChallengeBased = useDialogLeaderBoardChallengeBased();
    const loading = ref(true);
    const challengeId = ref("");
    const allGlobalChallenges: any = ref([]);
    const dialogSlot = useDialogSlot();

    function fnOpenDialog(id: any) {
      const router = useRouter();
      const route = useRoute();

      router.replace({
        path: route.path,
        query: {
          selectedButton: 1,
          challengeId: id,
        },
      });
      challengeId.value = id;
      dialogLeaderBoardChallengeBased.value = true;
      dialogSlot.value = true;
    }

    onMounted(async () => {
      loading.value = true;
      const [categories, error] = await getChallengesCategories();
      if (categories.length) {
        console.log("in if 1");
        categories.forEach(async (category: any) => {
          const [array, error] = await getChallengesByCategory(category.id);
          if (array.length) {
            console.log("in if 2");
            array.forEach((challenge: any) => {
              allGlobalChallenges.value.push(challenge);
            });
            loading.value = false;
          }
        });
      }
    });

    return {
      t,
      allGlobalChallenges,
      dialogLeaderBoardChallengeBased,
      dialogSlot,
      fnOpenDialog,
      ArrowRightIcon,
      loading,
      challengeId,
    };
  },
  components: { ArrowRightIcon },
};
</script>

<style scoped></style>
