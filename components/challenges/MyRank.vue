<template>
  <article class="flex items-center rounded-md px-4 py-2 bg-error-light md:rounded-lg">
    <TrophyIcon class="h-5 w-5 flex-shrink-0 text-error md:h-6 md:w-6" />
    <h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5">
      {{ t("Headings.MyRank", { rank: ordinalRank }) }}
    </h6>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { TrophyIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  props: {
    rank: { type: Number, default: 0 },
  },
  components: { TrophyIcon },
  setup(props) {
    const { t } = useI18n();

    const ordinalRank = computed(() => {
      let suffix = "th";

      if (props.rank == 0) suffix = "";
      else if (props.rank == 1) suffix = "st";
      else if (props.rank == 2) suffix = "nd";
      else if (props.rank == 3) suffix = "rd";

      return `${props.rank}${suffix}`;
    });

    return { t, ordinalRank };
  },
});
</script>
