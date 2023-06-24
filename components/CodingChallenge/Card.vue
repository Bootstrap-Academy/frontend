<template>
  <div class="p-4 xl:p-5 bg-secondary mb-4 rounded-md cursor-pointer">
    <article class="flex gap-3 justify-between">
      <p class="sm:w-3/4 clamp tight line-1 text-accent">
        {{ codingChallenge?.description ?? "" }}
      </p>
      <ArrowRightIcon
        class="h-6 w-6 text-accent transition-all duration-500 group-hover:scale-125"
      />
    </article>

    <article class="flex flex-wrap gap-x-5 gap-y-2 justify-between mt-4">
      <div class="flex items-center gap-3">
        <p v-if="!codingChallenge?.solved" class="text-sm">
          {{ t("Headings.Fee") }}:{{ item?.fee ?? "_" }}
        </p>

        <section v-if="codingChallenge?.solved" class="flex items-center gap-3">
          <p class="text-sm">
            {{ t("Headings.Solved") }}
          </p>
          <span class="bg-[#30cf2d] rounded-full p-0.5"
            ><CheckIcon class="h-3 w-3 text-white"
          /></span>
        </section>
      </div>

      <div class="flex gap-3">
        <p class="text-sm">
          {{ t("Headings.XP") }}:{{ codingChallenge?.xp ?? "" }}
        </p>
        <p class="text-sm">
          {{ t("Headings.Coins") }}:{{ codingChallenge?.coins ?? "" }}
        </p>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRightIcon, CheckIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  props: {
    codingChallenge: { type: Object, default: null },
  },
  components: { ArrowRightIcon, CheckIcon },

  setup() {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
