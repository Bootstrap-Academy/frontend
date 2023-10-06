<template>
  <SkeletonLeaderboard v-if="loading" />
  <LeaderboardListing
    v-else-if="leaderBoardList.length && !loading"
    :leaderBoardList="leaderBoardList"
  />
  <section v-else-if="!leaderBoardList.length && !loading">
    <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
  </section>
</template>

<script lang="ts">
import { getOverflowAncestors } from "@floating-ui/dom";
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    const loading = ref(true);
    const offset = useLeaderboardOffset();
    const leaderBoardList = useOverAllLeaderboardList();
    onMounted(async () => {
      offset.value = 0;
      await getOverAllLeaderBoard(offset.value);
      loading.value = false;
    });
    return { t, loading, leaderBoardList };
  },
};
</script>

<style scoped></style>
