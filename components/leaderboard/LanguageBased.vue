<template>
  <section>
    <article class="flex justify-end">
      <InputSelect />
    </article>
    <article class="h-[80vh] overflow-y-scroll px-10">
      <section v-for="(user, i) of leaderBoardList" :key="i">
        <LeaderboardUserCard :item="user" />
      </section>
    </article>
  </section>
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
