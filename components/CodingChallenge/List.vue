<template>
  <div>
    I am list of coding tasks

    {{ codingChallenges }}
  </div>
</template>

<script lang="ts">
import { PropType } from "nuxt/dist/app/compat/capi";
export default {
  props: {
    codingChallenges: { type: Array as PropType<any>, default: [] },
  },
  setup(props) {
    return {};
  },
};
</script>

<style lang="scss" scoped></style>
