<template>
  <article>
    <h4 class="text-heading-3">{{ t("Headings.Tasks") }}</h4>
    <div class="border border-primary rounded-md overflow-hidden mt-3">
      <table v-if="codingChallenges.length" class="min-w-full leading-normal">
        <tr>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            <!-- {{ t("Headings.Name") }} -->
            No.
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Description") }}
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            <!-- {{ t("Headings.Score") }} -->
            {{ t("Headings.XP") }}
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Submissions") }}
          </th>
        </tr>

        <tr v-for="(codingChallenge, i) of codingChallenges" :key="i">
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <!-- {{ task.name }} -->
            {{ i + 1 }}
          </td>
          <td
            class="px-5 w-40 h-20 overflow-scroll py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <div
              class=""
              v-html="$md.render(codingChallenge?.description ?? '')"
            ></div>
            <!-- {{ codingChallenge?.description ?? "" }} -->
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <!-- {{ task.score?.current ?? 0 }} / {{ task.score?.total ?? 0 }} -->
            {{ codingChallenge?.xp ?? "" }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <!-- {{ task.attempts }} -->
          </td>
        </tr>
      </table>
      <p
        v-if="!codingChallenges.length"
        class="py-3 text-center border border-accent rounded-lg px-3"
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
