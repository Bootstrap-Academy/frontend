<template>
  <div>
    <section v-if="leaderBoardList.length">
      <article
        class="flex gap-6 flex-col sm:flex-row items-center justify-center my-10 flex-wrap"
      >
        <LeaderboardTopUserCard :user="leaderBoardList[1]" />
        <LeaderboardTopUserCard :user="leaderBoardList[0]" class="sm:-mt-20" />
        <LeaderboardTopUserCard :user="leaderBoardList[2]" />
      </article>
      <article class="h-[80vh] overflow-y-scroll px-3 sm:px-10">
        <div v-for="(user, i) of leaderBoardList" :key="i">
          <LeaderboardUserCard v-if="user.rank > 3" :item="user" />
        </div>
      </article>
    </section>
    <section v-else-if="!leaderBoardList.length">
      <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
    </section>
  </div>
</template>

<script lang="ts">
import { PropType } from "nuxt/dist/app/compat/capi";
import { useI18n } from "vue-i18n";
export default {
  props: {
    leaderBoardList: { type: Array as PropType<any>, default: [] },
  },
  setup() {
    const { t } = useI18n();
    return { t };
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
