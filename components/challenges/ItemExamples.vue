<template>
  <div>
    <div class="flex max-sm:flex-col max-sm:space-y-2 justify-between items-center mb-10">
      <div class="flex items-center gap-2">
        <p>{{ t("Headings.Examples") }}:</p>
        <Tooltip :heading="'Headings.ResetExamples'" :placement="'right'" @click="resetExamples()">
          <ArrowPathIcon class="h-5 w-5 text-accent cursor-pointer hover:rotate-180 transition-all duration-700" />
        </Tooltip>
      </div>
      <Btn @click="testAllExamples()" sm :icon="BeakerIcon"> {{ t("Buttons.TestAgainstAll") }}</Btn>
    </div>

    <section v-for="(example, i) of exampleElements" :key="i" class="relative">
      <div
        class="bg-light my-3 card-sm rounded-md border-2 duration-700"
        :class="{
          'border-light': example.state === 'pending' || example.loading,
          'border-success': example.state === 'solved',
          'border-error': example.state === 'error',
        }"
      >
        <div class="flex justify-between mb-4">
          <p class="text-heading">{{ t("Headings.Example") }} {{ i + 1 }}</p>
          <div v-if="example.state === 'solved' && !example.loading"
            class="flex items-center bg-primary py-1.5 px-2 rounded-md shadow-md">
            <CheckCircleIcon class="h-5 w-5 text-accent mr-2" />
            <p class="text-sm text-success">
              {{ t("Headings.Solved") }}
            </p>
          </div>
          <InputBtn v-else secondary :icon="PlayIcon" :loading="example.loading" @click="testExample(example.id)" sm
            class="text-white">
            {{ t("Buttons.Test") }}
          </InputBtn>
        </div>
        <div class="sm:flex max-sm:space-y-2 sm:space-x-4">
          <div class="w-full text-sm bg-secondary py-2 px-4 rounded-md">
            <p class="text-white">
              {{ t("Headings.Input") }}
            </p>
            <p class="whitespace-pre-wrap">{{ example?.input ?? '' }}</p>
          </div>

          <div class="w-full text-sm bg-secondary py-2 px-4 rounded-md">
            <p class="text-white">
              {{ t("Headings.ExpectedOutput") }}
            </p>
            <p class="whitespace-pre-wrap">{{ example?.output ?? '' }}</p>
          </div>
        </div>

        <div
          class="text-sm bg-primary py-2 px-4 rounded-md my-4 space-y-3"
          v-if="example.state !== 'pending' && !example.loading"
        >
          <div class="flex items-start space-x-3">
            <div class="min-w-max mt-0.5">
              <component :is="verdictIcons(example.verdict)" class="h-5 w-5" />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">
                {{ exampleVerdictTitle(example) }}
              </p>
              <p
                v-if="exampleVerdictBody(example)"
                class="text-xs text-body-2 whitespace-pre-wrap"
              >
                {{ exampleVerdictBody(example) }}
              </p>
            </div>
          </div>

          <div v-if="exampleHasDetails(example)" class="text-xs">
            <button
              class="text-accent hover:underline"
              type="button"
              @click="toggleExampleDetails(example.id)"
            >
              {{
                isExampleDetailsOpen(example.id)
                  ? t("Buttons.HideDetails")
                  : t("Buttons.ShowDetails")
              }}
            </button>
            <div v-if="isExampleDetailsOpen(example.id)" class="mt-2 space-y-3 text-body-2">
              <p v-if="exampleDetailSummary(example)" class="whitespace-pre-wrap">
                {{ exampleDetailSummary(example) }}
              </p>
              <div v-if="example.compile?.stderr">
                <p class="font-semibold mb-1">{{ t("Headings.CompilerOutput") }}</p>
                <pre class="whitespace-pre-wrap bg-secondary rounded-md p-2 overflow-x-auto">
{{ example.compile.stderr }}
                </pre>
              </div>
              <div v-if="example.run?.stderr">
                <p class="font-semibold mb-1">{{ t("Headings.RuntimeStdErr") }}</p>
                <pre class="whitespace-pre-wrap bg-secondary rounded-md p-2 overflow-x-auto">
{{ example.run.stderr }}
                </pre>
              </div>
              <div v-if="example.run?.stdout">
                <p class="font-semibold mb-1">{{ t("Headings.RuntimeStdOut") }}</p>
                <pre class="whitespace-pre-wrap bg-secondary rounded-md p-2 overflow-x-auto">
{{ example.run.stdout }}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example?.explanation && !example.loading">
          <p class="text-success mb-2">{{ t("Headings.Explanation") }}:</p>
          <p class="whitespace-pre-wrap"> {{ example?.explanation ?? '' }} </p>
        </div>


      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import type { PropType } from "vue";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  BeakerIcon,
  PlayIcon,
  NoSymbolIcon,
  FlagIcon,
  CircleStackIcon,
  DocumentIcon,
  ShieldExclamationIcon,
  PowerIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  examples: { type: Array as PropType<any>, default: [] },
  code: { type: String, default: "" },
  environment: { type: String, default: "" },
  challengeId: { type: String, default: "" },
  codingChallengeId: { type: String, default: "" },
});

const { t } = useI18n();
const exampleElements: any = ref([]);
const exampleDetails = ref<Record<string, boolean>>({});

const verdictLabelMap: Record<string, string> = {
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

function getExampleIndexById(id: any) {
  return exampleElements.value.findIndex((example: any) => example.id == id);
}

async function testExample(id: any) {
  if (id == undefined || !!!id)
    return openSnackbar("info", "Headings.CannotTestForThisExample");
  exampleElements.value.forEach((example: any) => {
    if (example.id == id) example.loading = true;
  });

  const [success, error] = await testAgainstCodingExample(
    props.challengeId,
    props.codingChallengeId,
    id,
    {
      code: props.code,
      environment: props.environment,
    }
  );
  exampleElements.value.forEach((example: any) => {
    if (example.id == id) example.loading = false;
  });
  success ? successHandler(success, id) : errorHandler(error);
}

async function testAllExamples() {
  if (!props.examples.length) return;
  let promisesArray: any = [];
  props.examples.forEach(async (example: any) => {
    promisesArray.push(await testExample(example.id));
  });
  await Promise.all(promisesArray);
}

function resetExamples() {
  exampleElements.value.map((example: any) => {
    example.state = "pending";
    example.verdict = null;
    example.message = null;
    example.detail = "";
    example.compile = null;
    example.run = null;
    example.stderr = "";
    example.stdout = "";
    exampleDetails.value[String(example.id ?? "")] = false;
  });
}

function successHandler(success: any, id: any) {
  let atIndex: number = getExampleIndexById(id);

  const element = exampleElements.value[atIndex];
  element.verdict = success?.verdict ?? null;
  element.message = success?.message ?? null;
  element.detail = success?.message?.detail ?? "";
  element.compile = success?.compile ?? null;
  element.run = success?.run ?? null;
  element.stderr = success?.run?.stderr ?? success?.compile?.stderr ?? "";
  element.stdout = success?.run?.stdout ?? success?.compile?.stdout ?? "";
  element.state = success?.verdict === "OK" ? "solved" : "error";
  exampleDetails.value[String(id ?? "")] = false;
}

function errorHandler(error: any) {
  openSnackbar("error", error);
}

function verdictIcons(verdict: string) {
  const verdictIconMapping: { [key: string]: any } = {
    COMPILATION_ERROR: NoSymbolIcon,
    INVALID_OUTPUT_FORMAT: FlagIcon,
    MEMORY_LIMIT_EXCEEDED: CircleStackIcon,
    NO_OUTPUT: DocumentIcon,
    OK: CheckCircleIcon,
    PRE_CHECK_FAILED: ShieldExclamationIcon,
    RUNTIME_ERROR: PowerIcon,
    TIME_LIMIT_EXCEEDED: ClockIcon,
    WRONG_ANSWER: XMarkIcon,
  };
  if (!verdict) return NoSymbolIcon;
  const normalized = verdict.startsWith("Error.Verdict.")
    ? verdict.replace("Error.Verdict.", "")
    : verdict;
  return verdictIconMapping[normalized] ?? NoSymbolIcon;
}

function exampleVerdictTitle(example: any) {
  const message = example.message;
  if (message?.title_key) return t(message.title_key);
  const key = verdictLabelMap[example.verdict as string] ?? "";
  return key ? t(key) : "";
}

function exampleVerdictBody(example: any) {
  const message = example.message;
  if (!message?.body_key) return "";
  const params = message.body_params ?? {};
  return t(message.body_key, params);
}

function exampleDetailSummary(example: any) {
  return example.message?.detail ?? "";
}

function exampleHasDetails(example: any) {
  return (
    !!exampleDetailSummary(example) ||
    !!example.compile?.stderr ||
    !!example.run?.stderr ||
    !!example.run?.stdout
  );
}

function toggleExampleDetails(id: string) {
  const key = String(id ?? "");
  exampleDetails.value[key] = !exampleDetails.value[key];
}

function isExampleDetailsOpen(id: string) {
  const key = String(id ?? "");
  return !!exampleDetails.value[key];
}

watch(
  () => props.examples,
  (newValue: any) => {
    if (!newValue.length) return;
    exampleElements.value = newValue.map((element: any) => {
      exampleDetails.value[String(element.id ?? "")] = false;
      return {
        ...element,
        state: "pending",
        verdict: null,
        message: null,
        detail: "",
        compile: null,
        run: null,
        stdout: "",
        stderr: "",
        loading: false,
      };
    });
  }
);
</script>
