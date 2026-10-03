<template>
  <LeaderboardStatus v-if="page.error" :error="page.error" @reload="reload" />
  <SkeletonLeaderboard v-else-if="loading" />
  <LeaderboardListing
    v-else-if="codingChallengeLeaderboardList.length"
    :leaderBoardList="codingChallengeLeaderboardList"
  />
  <section v-else-if="!leaderBoardList.length">
    <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  props: {
    leaderBoardList: { type: Array, default: [] },
    challengeId: { type: String, default: "" },
  },

  setup(props) {
    const { t } = useI18n();
    const loading = ref(true);
    const offset = useLeaderboardOffset();
    const codingChallengeLeaderboardList = useCodingChallengeLeaderboardList();
    const page = useLeaderboardPage();
    const invalidation = useLeaderboardInvalidation();
    async function reload() {
      loading.value = true;
      await getCodingChallengeLeaderboard(props.challengeId, 0);
      loading.value = false;
    }
    onMounted(reload);
    watch(invalidation, reload);
    watch(() => props.challengeId, reload);
    return { t, loading, codingChallengeLeaderboardList, page, reload };
  },
};
</script>

<style scoped></style>
