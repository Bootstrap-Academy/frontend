<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->
<template>
  <main
    class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
  >
    <InputButtonToggle
      :buttonOptions="buttonOptions"
      v-model="selectedbutton"
    />
    <p class="text-heading-1 mt-6 mb-12">{{ t("Headings.LeaderBoard") }}:</p>

    <SkeletonLeaderboard v-if="loading && selectedbutton != 2" />
    <SkeletonLeaderBoardChallenges v-else-if="loading && selectedbutton == 2" />

    <LeaderboardSeasonal
      :leaderBoardList="leaderBoardList"
      v-if="selectedbutton == 0 && !loading"
    />
    <LeaderboardLanguageBased
      :leaderBoardList="leaderBoardList"
      v-else-if="selectedbutton == 1 && !loading"
    />
    <LeaderboardChallengeBased
      :leaderBoardList="leaderBoardList"
      v-else-if="selectedbutton == 2 && !loading"
    />
    <LeaderboardOverall
      :leaderBoardList="leaderBoardList"
      v-else-if="selectedbutton == 3 && !loading"
    />
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { useLeaderBoardList } from "~~/composables/leaderboard";
definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Leader board",
  },
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const leaderBoardList = useLeaderBoardList();
    const selectedbutton = ref(0);
    let buttonOptions: any = [
      { name: "Buttons.SeasonalBased" },
      { name: "Buttons.LanguageBased" },
      { name: "Buttons.ChallengeBased" },
      { name: "Buttons.Overall" },
    ];

    watch(
      () => selectedbutton.value,
      (newValue, oldValue) => {
        loading.value = true;
        setTimeout(() => {
          loading.value = false;
        }, 3000);
      }
    );
    return { buttonOptions, selectedbutton, t, leaderBoardList, loading };
  },
};
</script>

<style scoped></style>
