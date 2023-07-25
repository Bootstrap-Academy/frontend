<template>
  <LeaderboardListing :leaderBoardList="leaderBoardList" />
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  props: {
    leaderBoardList: { type: Array, default: [] },
  },
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>

<style scoped></style>
