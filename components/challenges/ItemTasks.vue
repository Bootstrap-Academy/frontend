<template>
  <article>
    <h4 class="text-heading-3">{{ t("Headings.Tasks") }}</h4>
    <div class="mt-3 overflow-hidden rounded-md border border-primary">
      <table v-if="codingChallenges.length" class="min-w-full leading-normal">
        <tr>
          <th
            class="border-b-2 border-primary bg-primary px-5 py-3 text-left text-sm font-semibold uppercase tracking-widest text-heading font-body"
          >
            <!-- {{ t("Headings.Name") }} -->
            No.
          </th>
          <th
            class="border-b-2 border-primary bg-primary px-5 py-3 text-left text-sm font-semibold uppercase tracking-widest text-heading font-body"
          >
            {{ t("Headings.Description") }}
          </th>
          <th
            class="border-b-2 border-primary bg-primary px-5 py-3 text-left text-sm font-semibold uppercase tracking-widest text-heading font-body"
          >
            <!-- {{ t("Headings.Score") }} -->
            {{ t("Headings.XP") }}
          </th>
          <th
            class="border-b-2 border-primary bg-primary px-5 py-3 text-left text-sm font-semibold uppercase tracking-widest text-heading font-body"
          >
            {{ t("Headings.Submissions") }}
          </th>
        </tr>

        <tr v-for="(codingChallenge, i) of codingChallenges" :key="i">
          <td class="text-body-1 border-b border-r border-primary px-5 py-3 text-body font-body">
            <!-- {{ task.name }} -->
            {{ i + 1 }}
          </td>
          <td
            class="text-body-1 h-20 w-40 overflow-scroll border-b border-r border-primary px-5 py-3 text-body font-body"
          >
            <div class="" v-html="$md.render(codingChallenge?.description ?? '')"></div>
            <!-- {{ codingChallenge?.description ?? "" }} -->
          </td>
          <td class="text-body-1 border-b border-r border-primary px-5 py-3 text-body font-body">
            <!-- {{ task.score?.current ?? 0 }} / {{ task.score?.total ?? 0 }} -->
            {{ codingChallenge?.xp ?? "" }}
          </td>
          <td class="text-body-1 border-b border-r border-primary px-5 py-3 text-body font-body">
            <!-- {{ task.attempts }} -->
          </td>
        </tr>
      </table>
      <p
        v-if="!codingChallenges.length"
        class="rounded-lg border border-accent px-3 py-3 text-center"
      >
        {{ t("Headings.NoCodingChallengeFound") }}
      </p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
    codingChallenges: { type: Array as PropType<any>, default: [] },
  },
  setup(props) {
    const { t } = useI18n();

    // const tasks = computed(() => {
    //   return props.data?.tasks ?? "";
    // });

    return { t };
  },
});
</script>

<style scoped></style>
