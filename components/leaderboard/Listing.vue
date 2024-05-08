<template>
  <div>
    <section v-if="leaderBoardList.length">
      <article
        class="flex gap-6 flex-col sm:flex-row items-center justify-center my-10 pt-10 flex-wrap"
      >
        <LeaderboardTopUserCard
          :user="leaderBoardList[1]"
          v-if="!!leaderBoardList[1]"
        />
        <LeaderboardTopUserCard
          :user="leaderBoardList[0]"
          class="sm:-mt-20"
          v-if="!!leaderBoardList[0]"
        />
        <LeaderboardTopUserCard
          :user="leaderBoardList[2]"
          v-if="!!leaderBoardList[2]"
        />
      </article>
      <article class="px-3 pb-24 sm:px-10">
        <div v-for="(user, i) of leaderBoardList" :key="i">
          <LeaderboardUserCard v-if="user.rank > 3" :item="user" />
        </div>
      </article>
    </section>

    <div class="flex justify-center mt-6">
      <InputBtn
      v-if="leaderBoardList.length < totalLeaderboardUsers"
        :loading="btnLoading"
        @click="loadMore()"
        :icon="TrophyIcon"
        iconRight
        :class="{
          'pointer-events-none opacity-70':
            btnLoading || leaderBoardList.length >= totalLeaderboardUsers,
        }"
      >
        <div>
          {{ t("Headings.More") }}
        </div>
      </InputBtn>
    </div>
    <p v-if="leaderBoardList.length == totalLeaderboardUsers" class="flex flex-col items-center text-accent">      
      <component v-if="TrophyIcon" :is="TrophyIcon" class="w-10 h-10 bg-primary mb-4"/>
      {{ t("Headings.NoMoreUser") }}
    </p>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { TrophyIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
export default {
  props: {
    leaderBoardList: { type: Array as PropType<any>, default: [] },
  },
  setup() {
    const { t } = useI18n();
    const limit = useLeaderboardLimit();
    const offset = useLeaderboardOffset();
    const btnLoading = ref(false);
    const route: any = useRoute();
    const totalLeaderboardUsers = useTotalLeaderboardUsers();

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
      offset.value += limit.value;
      btnLoading.value = true;
      if (selectedButton.value == 0) {
        await getLanguageLeaderboard(selectedLanguage.value, offset.value);
      } else if (selectedButton.value == 1) {
        await getCodingChallengeLeaderboard(
          selectedChallengeId.value,
          offset.value
        );
      } else if (selectedButton.value == 2) {
        await getOverAllLeaderBoard(offset.value);
        // await getLanguageLeaderboard();
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
    };
  },
};
</script>

<style scoped>
body {
  background-color: black;
  overflow: hidden;
}
h1 {
  position: relative;
  top: 100px;
}
.fireworks {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fireworks .firework {
  position: relative;
  top: 0px;
  left: 0px;
  margin: 0px 40px;
}
.fireworks .firework:before {
  content: "";
  display: block;
  border-radius: 5px;
  background-color: #daa520;
  width: 5px;
  height: 0px;
  will-change: transform;
  transform: translateY(1000px);
  animation: fireworkstart 3s ease-out infinite;
}
.fireworks .firework .explosion {
  position: absolute;
  top: 0;
  width: 5px;
  height: 20px;
  opacity: 0;
  transform-origin: top center;
  will-change: transform;
  animation: explosion 0.7s linear 3s infinite;
}
.fireworks .firework .explosion:nth-child(1) {
  transform: rotate(0deg);
}
.fireworks .firework .explosion:nth-child(2) {
  transform: rotate(90deg);
}
.fireworks .firework .explosion:nth-child(3) {
  transform: rotate(180deg);
}
.fireworks .firework .explosion:nth-child(4) {
  transform: rotate(-90deg);
}
.fireworks .firework .explosion:nth-child(5) {
  transform: rotate(45deg);
}
.fireworks .firework .explosion:nth-child(6) {
  transform: rotate(-45deg);
}
.fireworks .firework .explosion:nth-child(7) {
  transform: rotate(135deg);
}
.fireworks .firework .explosion:nth-child(8) {
  transform: rotate(225deg);
}

.fireworks .firework .explosion .spark {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  will-change: transform;
  animation: explosion2 0.7s ease-in-out 3s infinite;
}

.fireworks .firework .explosion .spark.silver {
  background-color: #c0c0c0;
}
.fireworks .firework .explosion .spark.gold {
  background-color: #daa520;
}
@keyframes fireworkstart {
  0% {
    height: 0px;
    transform: translateY(1000px);
  }
  50% {
    height: 50px;
  }
  75% {
    height: 30px;
  }
  100% {
    height: 0;
    transform: translateY(0);
  }
}

@keyframes explosion {
  0% {
    height: 0px;
    opacity: 0;
  }
  50% {
    height: 25px;
    opacity: 1;
  }
  100% {
    height: 0px;
    opacity: 0;
  }
}
@keyframes explosion2 {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(5px);
  }
  75% {
    transform: translateY(50px);
  }
  100% {
    transform: translateY(70px);
  }
}
</style>
