<template>
  <SkeletonLeaderboard v-if="loading" />
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
    onMounted(async () => {
      console.log("id", props.challengeId);
      offset.value = 0;
      codingChallengeLeaderboardList.value = [];
      await getCodingChallengeLeaderboard(props.challengeId, offset.value);
      loading.value = false;
    });
    return { t, loading, codingChallengeLeaderboardList };
  },
};
</script>

<style scoped></style>
