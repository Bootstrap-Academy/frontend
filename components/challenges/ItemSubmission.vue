<template>
  <article>
    <h4 class="text-heading-3">{{ t("Headings.Submissions") }}</h4>
    <div class="border border-primary rounded-md overflow-auto mt-3">
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
            class="px-2 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm"
          >
            {{ dateFormat(submission?.creation_timestamp) }}
          </td>
          <td
            class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm"
          >
            {{ submission?.environment ?? "" }}
          </td>
          <td class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body text-sm min-w-[200px]">
            <div class="text-sm bg-primary p-2 rounded-md flex items-center space-x-4">
              <div class="w-full flex space-x-2 items-center">
                <div class="min-w-max">
                  <component :is="verdictIcons(submission.result?.verdict)" class="h-5 w-5" />
                </div>
                <span>
                  {{ t(verdictIs(submission)) }}
                </span>
              </div>
              <Tooltip :heading="t('Headings.ShowErrorMessage')">
                <ExclamationTriangleIcon v-if="submission.result.compile?.stderr || submission.result.run?.stderr"
                  class="h-5 w-5 text-accent cursor-pointer" @click="openErrorMessageDialog(submission)" />
              </Tooltip>
            </div>
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
import { CheckIcon, ExclamationTriangleIcon, NoSymbolIcon, FlagIcon, CircleStackIcon, DocumentIcon, CheckCircleIcon, ShieldExclamationIcon, PowerIcon, ClockIcon, XMarkIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  emits: ["id"],
  props: {
    data: { type: Object as PropType<any>, default: null },
    challengeId: { type: String, default: "" },
    codingChallengeId: { type: String, default: "" },
  },
  components: { CodeBracketIcon, CheckIcon, CheckBadgeIcon, ExclamationTriangleIcon },
  setup(props, { emit }) {
    const { t } = useI18n();
    const submissions: any = useCodingSubmissions();

    const verdictIs: any = (submission: any) => {
      const verdictMapping: { [key: string]: string } = {
        COMPILATION_ERROR: "Error.Verdict.COMPILATION_ERROR",
        INVALID_OUTPUT_FORMAT: "Error.Verdict.INVALID_OUTPUT_FORMAT",
        MEMORY_LIMIT_EXCEEDED: "Error.Verdict.MEMORY_LIMIT_EXCEEDED",
        NO_OUTPUT: "Error.Verdict.NO_OUTPUT",
        OK: "Error.Verdict.OK",
        PRE_CHECK_FAILED: "Error.Verdict.PRE_CHECK_FAILED",
        RUNTIME_ERROR: "Error.Verdict.RUNTIME_ERROR",
        TIME_LIMIT_EXCEEDED: "Error.Verdict.TIME_LIMIT_EXCEEDED",
        WRONG_ANSWER: "Error.Verdict.WRONG_ANSWER",
      };

      const verdict = submission.result?.verdict ?? "";
      console.log("verdict is ", verdict);

      if (!submission.result) {
        return "Headings.PendingResult";
      }

      return verdictMapping[verdict] || "No_Output";
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

    function openErrorMessageDialog(submission: any) {
      const errorMessage = submission.result.compile?.stderr || submission.result.run?.stderr;
      openDialog(
        'error',
        'Headings.ErrorMessage',
        errorMessage,
        false,
        {
          label: 'Buttons.Okay',
          onclick: async () => { },
        },
        {},
      );
    }

    function verdictIcons(verdict: string){
      const verdictIconMapping: { [key: string]: any } = {
        "COMPILATION_ERROR": NoSymbolIcon,
        "INVALID_OUTPUT_FORMAT": FlagIcon,
        "MEMORY_LIMIT_EXCEEDED": CircleStackIcon,
        "NO_OUTPUT": DocumentIcon,
        "OK": CheckCircleIcon,
        "PRE_CHECK_FAILED": ShieldExclamationIcon,
        "RUNTIME_ERROR": PowerIcon,
        "TIME_LIMIT_EXCEEDED": ClockIcon,
        "WRONG_ANSWER": XMarkIcon,
      };
      return verdictIconMapping[verdict];
    }

    return {
      t,
      submissions,
      formattedTimeStamp,
      loadSubmission,
      dateFormat,
      verdictIs,
      openErrorMessageDialog,
      verdictIcons,
      CheckIcon,
      CodeBracketIcon,
      CheckBadgeIcon,
      NoSymbolIcon,
      FlagIcon,
      CircleStackIcon,
      DocumentIcon,
      CheckCircleIcon,
      ShieldExclamationIcon,
      PowerIcon,
      ClockIcon,
      XMarkIcon,
      ExclamationTriangleIcon,
    };
  },
});
</script>
