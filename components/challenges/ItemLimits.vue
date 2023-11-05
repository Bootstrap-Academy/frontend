<template>
  <article>
    <h4 class="text-heading-3">{{ t("Headings.Limits") }}</h4>
    <ul>
      <!-- <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.TimeLimit") }}:{{ data?.time_limit ?? "" }}
      </li>
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.MemoryLimit") }}:{{ data?.memory_limit ?? "" }}
      </li> -->
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Headings.Fee") }}:{{ data?.fee ?? "" }}
      </li>
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.Coins") }}:{{ data?.coins ?? "" }}
      </li>
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.Xp") }}:{{ data?.xp ?? "" }}
      </li>
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.StaticTests") }}:{{ data?.xp ?? "" }}
      </li>
      <li class="list-item list-disc list-inside pl-4">
        {{ t("Inputs.RandomTests") }}:{{ data?.xp ?? "" }}
      </li>
    </ul>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    // const limits = computed(() => {
    //   console.log("props.data?.limits ?? ''", props.data);
    //   return props.data?.limits ?? "";
    // });

    return { t };
  },
});
</script>

<style scoped></style>
