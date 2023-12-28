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
            {{ t("Headings.Error") }}
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
            class="px-2 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm"
          >
            {{ dateFormat(submission?.creation_timestamp) }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm"
          >
            {{ submission?.environment ?? "" }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm min-w-[200px]"
          >
            <p class="text-sm bg-light p-2 rounded-md">
              {{ t(verdictIs(submission)) }}
            </p>
          </td>

          <!-- error for submission-->
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm"
          >
            <div
              v-if="
                !!submission.result.compile &&
                !!submission.result.compile.stderr
              "
            >
              <p class="text-sm bg-light p-2 rounded-md">
                {{ submission.result.compile.stderr }}
              </p>
            </div>
            <div
              v-if="!!submission.result.run && !!submission.result.run.stderr"
            >
              <p class="text-sm bg-light p-2 rounded-md">
                {{ submission.result.run.stderr }}
              </p>
            </div>
            <p
              v-if="
                !!!submission?.result?.run?.stderr &&
                !!!submission?.result?.compile?.stderr
              "
            >
              {{ t("Headings.NoErrorFound") }}
            </p>
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
          >
            <InputBtn
              class="w-fit"
              @click="loadSubmission(submission?.id ?? '')"
              sm
              secondary
              :icon="CodeBracketIcon"
            >
              {{ t("Buttons.Load") }}
            </InputBtn>
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
import { CodeBracketIcon, CheckBadgeIcon } from "@heroicons/vue/24/solid";
import { useCodingSubmissions } from "~~/composables/codingChallenges";
import { useDateFormat } from "@vueuse/core";
import { CheckIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  emits: ["id"],

  props: {
    data: { type: Object as PropType<any>, default: null },
    challengeId: { type: String, default: "" },
    codingChallengeId: { type: String, default: "" },
  },
  components: { CodeBracketIcon, CheckIcon, CheckBadgeIcon },
  setup(props, { emit }) {
    const { t } = useI18n();
    const submissions: any = useCodingSubmissions();

    const verdictIs: any = (submission: any) => {
      let verdict = submission.result?.verdict ?? "";
      console.log("verdict is ", verdict);
      if (!!!submission.result) {
        return "Headings.PendingResult";
      }

      let toReturnVerdict: string | any = "";

      switch (verdict) {
      case "COMPILATION_ERROR":
        toReturnVerdict = "Error.Verdict.COMPILATION_ERROR";
        break;
      case "INVALID_OUTPUT_FORMAT":
        toReturnVerdict = "Error.Verdict.INVALID_OUTPUT_FORMAT";
        break;
      case "MEMORY_LIMIT_EXCEEDED":
        toReturnVerdict = "Error.Verdict.MEMORY_LIMIT_EXCEEDED";
        break;
      case "NO_OUTPUT":
        toReturnVerdict = "Error.Verdict.NO_OUTPUT";
        break;
      case "OK":
        toReturnVerdict = "Error.Verdict.OK";
        break;
      case "PRE_CHECK_FAILED":
        toReturnVerdict = "Error.Verdict.PRE_CHECK_FAILED";
        break;
      case "RUNTIME_ERROR":
        toReturnVerdict = "Error.Verdict.RUNTIME_ERROR";
        break;
      case "TIME_LIMIT_EXCEEDED":
        toReturnVerdict = "Error.Verdict.TIME_LIMIT_EXCEEDED";
        break;
      case "WRONG_ANSWER":
        toReturnVerdict = "Error.Verdict.WRONG_ANSWER";
        break;

      default:
        toReturnVerdict = "No_Output";
        break;
      }
      return toReturnVerdict;
    };

    const dateFormat = (date: any) => {
      let utcDate = new Date(date);
      const localTime = utcDate.toLocaleString();
      // let ms=localDate.gett
      // console.log("ms is", localTime);
      // const submissionAt = useDateFormat(localTime, "MMMM DD, YYYY  HH:mm");
      return localTime;
    };
    function formattedTimeStamp(timeStamp: any) {
      const formatted = useDateFormat(timeStamp, "YYYY-MM-DD/H:mm");
      return formatted;
    }
    async function loadSubmission(id: any) {
      const [success, error] = await getSubmission(
        props.challengeId,
        props.codingChallengeId,
        id
      );

      if (!!error) openSnackbar("error", error);
    }

    return {
      t,
      submissions,
      CodeBracketIcon,
      CheckBadgeIcon,
      formattedTimeStamp,
      loadSubmission,
      CheckIcon,
      dateFormat,
      verdictIs,
    };
  },
});
</script>

<style scoped></style>
