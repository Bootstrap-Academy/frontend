<template>
  <article class="flex items-center rounded-md p-2 text-warning bg-warning-light md:rounded-lg">
    <BoltIcon class="h-5 w-5 flex-shrink-0 text-[#f2c94c] md:h-6 md:w-6" />
    <h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5">{{ abbreviateNumber(xp) }} XP</h6>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { BoltIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { BoltIcon },
  setup(props) {
    const xp = computed(() => {
      return props.data?.total_xp ?? 0;
    });

    return { xp };
  },
});
</script>

<style scoped></style>
