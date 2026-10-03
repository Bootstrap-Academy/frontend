<template>
  <div>
    <section v-if="leaderBoardList.length">
      <article
        class="my-10 flex flex-col flex-wrap items-center justify-center gap-6 pt-10 sm:flex-row"
      >
        <LeaderboardTopUserCard :user="topThreeUsers[1]" v-if="!!topThreeUsers[1]" />
        <LeaderboardTopUserCard
          :user="topThreeUsers[0]"
          class="sm:-mt-20"
          v-if="!!topThreeUsers[0]"
        />
        <LeaderboardTopUserCard :user="topThreeUsers[2]" v-if="!!topThreeUsers[2]" />
      </article>
      <article class="px-3 pb-24 sm:px-10">
        <div v-for="(user, i) of remainingUsers" :key="i">
          <LeaderboardUserCard :item="user" />
        </div>
      </article>
    </section>

    <div class="mt-6 flex justify-center">
      <InputBtn
        v-if="hasMore"
        :loading="btnLoading"
        :disabled="btnLoading"
        @click="loadMore()"
        :icon="TrophyIcon"
        iconRight
        :class="{
          'pointer-events-none opacity-70': btnLoading,
        }"
      >
        <div>
          {{ t("Headings.More") }}
        </div>
      </InputBtn>
    </div>
    <p v-if="!hasMore" class="flex flex-col items-center text-accent">
      <component v-if="TrophyIcon" :is="TrophyIcon" class="mb-4 h-10 w-10 bg-primary" />
      {{ t("Headings.NoMoreUser") }}
    </p>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { computed } from "vue";
import { TrophyIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
export default {
  props: {
    leaderBoardList: { type: Array as PropType<any>, default: [] },
  },
  setup(props) {
    const { t } = useI18n();
    const limit = useLeaderboardLimit();
    const offset = useLeaderboardOffset();
    const btnLoading = ref(false);
    const route: any = useRoute();
    const totalLeaderboardUsers = useTotalLeaderboardUsers();
    // Offset works for both the legacy filtered pages and the publication DTO.
    const hasMore = computed(() => offset.value + limit.value < totalLeaderboardUsers.value);
    const topThreeUsers = computed(() => props.leaderBoardList.slice(0, 3));
    const remainingUsers = computed(() => props.leaderBoardList.slice(3));

    const selectedButton = computed(() => {
      return route?.query?.selectedButton ?? "";
    });

    const selectedLanguage = computed(() => {
      return route?.query?.selectedLanguage ?? "";
    });

    const selectedChallengeId = computed(() => {
      return route?.query?.challengeId ?? "";
    });

    async function loadMore() {
      if (btnLoading.value) return;
      const nextOffset = offset.value + limit.value;
      btnLoading.value = true;
      if (selectedButton.value == 0) {
        await getLanguageLeaderboard(selectedLanguage.value, nextOffset);
      } else if (selectedButton.value == 1) {
        await getCodingChallengeLeaderboard(selectedChallengeId.value, nextOffset);
      } else if (selectedButton.value == 2) {
        await getOverAllLeaderBoard(nextOffset);
      }
      btnLoading.value = false;
    }
    return {
      t,
      loadMore,
      TrophyIcon,
      btnLoading,
      offset,
      totalLeaderboardUsers,
      hasMore,
      topThreeUsers,
      remainingUsers,
    };
  },
};
</script>
