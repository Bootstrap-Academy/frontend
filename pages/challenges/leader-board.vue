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
    class="grid-auto min pt-container-sm container grid-rows-[auto_auto_1fr] gap-card pb-container"
  >
    <div class="mb-8 flex flex-col items-center">
      <div class="mb-4 flex items-center space-x-4">
        <TrophyIcon class="h-8 w-8 text-accent" />
        <p class="text-heading-1 text-accent">{{ t("Headings.LeaderBoard") }}</p>
      </div>

      <InputButtonToggle :buttonOptions="buttonOptions" v-model="selectedbutton" />
    </div>

    <SkeletonLeaderboard v-if="loading && selectedbutton != 1" />

    <!-- <LeaderboardSeasonal
      :leaderBoardList="leaderBoardList"
      v-if="selectedbutton == 0 && !loading"
    /> -->

    <LeaderboardLanguageBased
      :leaderBoardList="leaderBoardList"
      v-if="selectedbutton == 0 && !loading"
    />
    <LeaderboardChallengeBased
      :leaderBoardList="leaderBoardList"
      v-else-if="selectedbutton == 1 && !loading"
    />
    <LeaderboardOverall v-else-if="selectedbutton == 2 && !loading" />
  </main>
</template>

<script lang="ts">
import { TrophyIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { useLeaderBoardList } from "~~/composables/leaderboard";
definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Leader board",
  },
  components: {
    TrophyIcon,
  },
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const leaderBoardList = useLeaderBoardList();
    const selectedbutton: any = ref(localStorage.getItem("selectedButtonLeaderBoard") ?? 0);
    const router = useRouter();
    const route = useRoute();
    let buttonOptions: any = [
      // { name: "Buttons.SeasonalBased" },
      { name: "Buttons.LanguageBased" },
      { name: "Buttons.ChallengeBased" },
      { name: "Buttons.Overall" },
    ];

    watch(
      () => selectedbutton.value,
      (newValue: any, oldValue) => {
        localStorage.setItem("selectedButtonLeaderBoard", newValue);
        router.replace({
          path: route.path,
          query: {
            selectedButton: selectedbutton.value,
          },
        });
      },
      { immediate: true }
    );
    onUnmounted(() => {
      localStorage.removeItem("selectedButtonLeaderBoard");
    });

    return { buttonOptions, selectedbutton, t, leaderBoardList, loading, TrophyIcon };
  },
};
</script>
