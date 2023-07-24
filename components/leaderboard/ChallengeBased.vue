<template>
  <div class="h-[80vh] overflow-y-scroll px-3">
    <section
      @click="fnOpenDialog(1)"
      class="border-b border-accent border-t cursor-pointer border-t-transparent border-x border-x-transparent hover:border hover:border-accent transition-all my-3 p-3 sm:p-5 rounded-md flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center"
      v-for="(challenge, i) of allGlobalChallenges"
      :key="i"
    >
      <p class="text-white">
        {{ challenge?.description ?? "" }}
      </p>
      <article class="flex gap-2 items-center">
        <SvgLevel1Icon />
        <p>Alex Coasta <span class="text-sm"> xp:4900 </span></p>
      </article>
    </section>
    <DialogSlot
      v-if="dialogLeaderBoardChallengeBased"
      :label="'Headings.LeaderBoard'"
      :propClass="'modal-width-lg lg:modal-width-md shadow-sm shadow-accent'"
      :show="dialogSlot"
      @closeFunction="dialogLeaderBoardChallengeBased = false"
    >
      <LeaderboardChallengeBasedListDialog :leaderBoardList="leaderBoardList" />
    </DialogSlot>
  </div>
</template>

<script lang="ts">
export default {
  props: { leaderBoardList: { type: Array, default: [] } },
  setup() {
    const dialogLeaderBoardChallengeBased =
      useDialogLeaderBoardChallengeBased();
    const allGlobalChallenges = useAllGlobalChallenges();
    const dialogSlot = useDialogSlot();

    function fnOpenDialog(id: any) {
      dialogLeaderBoardChallengeBased.value = true;
      dialogSlot.value = true;
    }

    return {
      allGlobalChallenges,
      dialogLeaderBoardChallengeBased,
      dialogSlot,
      fnOpenDialog,
    };
  },
};
</script>

<style scoped></style>
