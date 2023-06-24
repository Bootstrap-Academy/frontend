<template>
  <article>
    <h4 class="text-heading-3">{{ t("Headings.Submissions") }}</h4>
    <div class="border border-primary rounded-md overflow-scroll mt-3">
      <table class="w-full overflow-scroll">
        <tr>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            No.
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Timestamp") }}
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Language") }}
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Status") }}
          </th>
          <th
            class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
          >
            {{ t("Headings.Actions") }}
          </th>
        </tr>

        <tr v-for="(submission, i) of submissions" :key="submission.name">
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            #{{ i + 1 }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            {{ formattedTimeStamp(submission?.creation_timestamp) }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            {{ submission?.environment ?? "" }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <p class="px-2 bg-error text-heading rounded-sm w-fit mx-auto mb-2">
              {{ submission?.result?.compile?.status ?? "" }}
            </p>
            <Btn sm tertiary>
              {{ t("Buttons.Details") }}
            </Btn>
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <Btn
              @click="emitId(submission?.id ?? '')"
              sm
              secondary
              :icon="CodeBracketIcon"
            >
              {{ t("Buttons.Load") }}
            </Btn>
          </td>
        </tr>
      </table>
      <p class="p-3 text-accent w-full" v-if="!submissions.length">
        {{ t("Headings.NoSubmissionCreated") }}
      </p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { PropType } from "vue";
import { CodeBracketIcon } from "@heroicons/vue/24/solid";
import { useCodingSubmissions } from "~~/composables/codingChallenges";
import { useDateFormat } from "@vueuse/core";

export default defineComponent({
  emits: ["id"],

  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { CodeBracketIcon },
  setup(props, { emit }) {
    const { t } = useI18n();
    const submissions: any = useCodingSubmissions();
    function formattedTimeStamp(timeStamp: any) {
      const formatted = useDateFormat(timeStamp, "YYYY-MM-DD/HH:mm");
      return formatted;
    }
    function emitId(id: any) {
      emit("id", id);
    }
    return { t, submissions, CodeBracketIcon, formattedTimeStamp, emitId };
  },
});
</script>

<style scoped></style>
