<template>
  <LeaderboardStatus v-if="page.error" :error="page.error" @reload="reload" />
  <SkeletonLeaderboard v-else-if="loading" />
  <LeaderboardListing
    v-else-if="leaderBoardList.length && !loading"
    :leaderBoardList="leaderBoardList"
  />
  <section v-else-if="!leaderBoardList.length && !loading">
    <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    const loading = ref(true);
    const offset = useLeaderboardOffset();
    const leaderBoardList = useOverAllLeaderboardList();
    const page = useLeaderboardPage();
    const invalidation = useLeaderboardInvalidation();
    async function reload() {
      loading.value = true;
      await getOverAllLeaderBoard(0);
      loading.value = false;
    }
    onMounted(reload);
    watch(invalidation, reload);
    return { t, loading, leaderBoardList, page, reload };
  },
};
</script>

<style scoped></style>
