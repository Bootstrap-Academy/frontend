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
      <div class="bg-light my-3 card-sm rounded-md border-2 duration-700" :class="{
        'border-light': example.solved == 'pending' || example.loading,
        'border-success': example.solved == 'solved',
        'border-error': example.solved != 'solved' && example.solved != 'pending',
      }">
        <div class="flex justify-between mb-4">
          <p class="text-heading">{{ t("Headings.Example") }} {{ i + 1 }}</p>
          <div v-if="example.solved == 'solved' && !example.loading"
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

        <div class="text-sm text-error bg-primary py-2 px-4 rounded-md my-4 flex items-center space-x-6"
          v-if="example.solved != 'solved' && example.solved != 'pending' && !example.loading">
          <div class="sm:flex sm:space-x-2 items-center text-sm">
            <p class="text-error">{{ t("Headings.Error") }}:</p>
            <div class="flex space-x-2 items-center">
              <component :is="verdictIcons(example.solved)" class="h-5 w-5" />
              <p>
                {{
                  example.solved == null
                    ? "There is no output for your provided code"
                    : t(example.solved)
                }}
              </p>
            </div>
          </div>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example?.stderr && !example.loading">
          <p class="text-error mb-2">{{ t("Headings.ErrorMessage") }}:</p>
          <p class="whitespace-pre-wrap"> {{ example?.stderr ?? '' }} </p>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4"
          v-if="!!example?.stdout && example.solved != 'solved' && !example.loading">
          <p class="text-success mb-2">{{ t("Headings.ActualOutput") }}:</p>
          <p class="whitespace-pre-wrap"> {{ example?.stdout ?? '' }} </p>
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
    example.solved = "pending";
    example.stderr = "";
    example.stdout = "";
  });
}

function successHandler(success: any, id: any) {
  let atIndex: number = getExampleIndexById(id);

  if (!!success.compile && (success.compile?.stdout != "" || success.compile?.stderr != "")) {
    exampleElements.value[atIndex].stderr =
      success.compile?.stderr ?? "";
    exampleElements.value[atIndex].stdout =
      success.compile?.stdout ?? "";
  } else if (!!success.run && (success.run?.stdout != "" || success.run?.stderr != "")) {
    exampleElements.value[atIndex].stderr =
      success.run?.stderr ?? "";
    exampleElements.value[atIndex].stdout =
      success.run?.stdout ?? "";
  }

  if (success?.verdict == "OK") {
    exampleElements.value[atIndex].solved = "solved";
  } else {
    setResonBasedOnVerdict(success, id);
  }
}

function setResonBasedOnVerdict(success: any, id: any) {
  let atIndex: number = getExampleIndexById(id);

  const verdictMapping: { [key: string]: string } = {
    "COMPILATION_ERROR": "Error.Verdict.COMPILATION_ERROR",
    "INVALID_OUTPUT_FORMAT": "Error.Verdict.INVALID_OUTPUT_FORMAT",
    "MEMORY_LIMIT_EXCEEDED": "Error.Verdict.MEMORY_LIMIT_EXCEEDED",
    "NO_OUTPUT": "Error.Verdict.NO_OUTPUT",
    "OK": "Error.Verdict.OK",
    "PRE_CHECK_FAILED": "Error.Verdict.PRE_CHECK_FAILED",
    "RUNTIME_ERROR": "Error.Verdict.RUNTIME_ERROR",
    "TIME_LIMIT_EXCEEDED": "Error.Verdict.TIME_LIMIT_EXCEEDED",
    "WRONG_ANSWER": "Error.Verdict.WRONG_ANSWER",
  };

  exampleElements.value[atIndex].solved =
    verdictMapping[success?.verdict] || null;
}

function errorHandler(error: any) {
  openSnackbar("error", error);
}

function verdictIcons(verdict: string) {
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
  return verdictIconMapping[verdict.replace("Error.Verdict.", "")];
}

watch(
  () => props.examples,
  (newValue: any, oldValue: any) => {
    if (!newValue.length) return;
    console.log("watching");
    exampleElements.value = newValue.map((element: any) => {
      element.solved = "pending";
      element.stdout = "";
      element.stderr = "";
      element.loading = false;
    });
    exampleElements.value = newValue;
  }
);
</script>
