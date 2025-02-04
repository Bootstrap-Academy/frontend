<template>
  <div
    class="p-4 xl:p-5 relative bg-secondary mb-4 rounded-md cursor-pointer group"
  >
    <section>
      <article class="flex gap-3 justify-between">
        <p
          v-if="!!codingChallenge?.description"
          class="sm:w-3/4 tight text-accent"
        >
          <span v-html="$md.render(codingChallenge?.description ?? '')"></span>
        </p>

        <ArrowRightIcon
          v-if="!codingChallenge.solved"
          class="h-6 w-6 text-accent transition-all duration-500 group-hover:translate-x-1"
        />

        <p
          @click="feedback($event)"
          class="text-success hover:scale-110 transition-all"
          v-if="
            codingChallenge?.solved &&
            !!!codingChallenge?.rated &&
            user?.id != codingChallenge?.creator
          "
        >
          {{ t("Headings.Feedback") }}
        </p>
      </article>

      <article class="flex gap-3">
        <p class="text-sm">
          {{ t("Headings.XP") }}:{{ codingChallenge?.xp ?? "" }}
        </p>
        <p class="text-sm">
          {{ t("Headings.Coins") }}:{{ codingChallenge?.coins ?? "" }}
        </p>
      </article>

      <section v-if="codingChallenge?.solved" class="absolute -top-1 -right-1">
        <CheckIcon class="bg-accent rounded-full p-0.5 h-5 w-5 text-white" />
      </section>
    </section>

    <DialogSlot
      v-if="dialogCodingChallengeFeedback"
      :label="'Headings.Feedback'"
      :propClass="'modal-width-lg lg:modal-width-sm'"
      :show="dialogSlot"
      @closeFunction="dialogClosed()"
    >
      <CodingChallengeModalFeedback
        @submitted="codingChallenge.rated = true"
        :challengeId="codingChallenge.task_id"
        :codingChallengeId="codingChallenge.id"
      />
    </DialogSlot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowRightIcon,
  CheckIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";

export default defineComponent({
  props: {
    codingChallenge: { type: Object, default: null },
  },
  components: { ArrowRightIcon, CheckIcon, LockClosedIcon },

  setup() {
    const { t } = useI18n();
    const dialogCodingChallengeFeedback: any =
      useDialogCodingChallengeFeedback();
    const dialogSlot = useDialogSlot();
    const user: any = useUser();

    function feedback(event: any) {
      event.stopPropagation();
      dialogSlot.value = true;
      dialogCodingChallengeFeedback.value = true;
    }

    function dialogClosed() {
      dialogCodingChallengeFeedback.value = false;
      dialogSlot.value = false;
    }

    return {
      t,
      feedback,
      dialogCodingChallengeFeedback,
      dialogSlot,
      dialogClosed,
      user,
    };
  },
});
</script>

<style scoped></style>
