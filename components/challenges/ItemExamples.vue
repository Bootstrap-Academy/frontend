<template>
  <div>
    <div class="flex justify-between items-center mb-10">
      <div class="flex items-center gap-2">
        <p>{{ t("Headings.Examples") }}:</p>
        <Tooltip :heading="'Headings.ResetExamples'" :placement="'right'" @click="resetExamples()">
          <ArrowPathIcon class="h-5 w-5 text-accent cursor-pointer hover:rotate-180 transition-all duration-700" />
        </Tooltip>
      </div>
      <Btn @click="testAgainstAll()" sm :icon="BeakerIcon"> {{ t("Buttons.TestAgainstAll") }}</Btn>
    </div>


    <section v-for="(example, i) of duplicateExamples" :key="i" class="relative">
      <div class="bg-light my-3 card-sm rounded-md border-2 duration-500" :class="{
        'border-light': example.solved == 'pending',
        'border-success': example.solved == 'solved',
        'border-error': example.solved != 'solved' && example.solved != 'pending',
      }">
        <div class="flex">
          <div class="w-full">
            <p class="text-white">
              {{ t("Headings.Input") }}
            </p>
            <p class="whitespace-pre">{{ example?.input ?? '' }}</p>
          </div>

          <div class="w-full">
            <p class="text-white">
              {{ t("Headings.ExpectedOutput") }}
            </p>
            <p class="whitespace-pre">{{ example?.output ?? '' }}</p>
          </div>
        </div>

        <div class="text-sm text-error bg-primary py-2 px-4 rounded-md my-4 flex items-center space-x-6"
          v-if="example.solved != 'solved' && example.solved != 'pending'">
          <ExclamationCircleIcon class="h-5 w-5 text-error" />
          <div class="flex space-x-2 items-center text-sm">
            <p class="text-error">{{ t("Headings.Error") }}:</p>
            <p>
              {{
                example.solved == null
                  ? "There is no output for your provided code"
                  : t(example.solved)
              }}
            </p>
          </div>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example?.stderr">
          <p class="text-error mb-2">{{ t("Headings.ErrorMessage") }}:</p>
          <p> {{ example?.stderr ?? '' }} </p>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example?.stdout">
          <p class="text-success mb-2">{{ t("Headings.ActualOutput") }}:</p>
          <p> {{ example?.stdout ?? '' }} </p>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example?.explanation">
          <p class="text-success mb-2">{{ t("Headings.Explanation") }}:</p>
          <p> {{ example?.explanation ?? '' }} </p>
        </div>

        <div class="text-sm bg-primary py-2 px-4 rounded-md my-4" v-if="!!example">
          <p class="text-warning mb-2">DEBUG:</p>
          <p> {{ example ?? '' }} </p>
        </div>

        <div class="flex justify-end">
          <div v-if="example.solved == 'solved' && !example.loading"
            class="flex items-center bg-primary py-1.5 px-2 rounded-md shadow-md">
            <CheckCircleIcon class="h-5 w-5 text-accent mr-2" />
            <p class="text-sm text-success">
              {{ t("Headings.Solved") }}
            </p>
          </div>
          <InputBtn v-else secondary :icon="PlayIcon" :loading="example.loading" @click="TestAgainstMe(example.id)" sm
            class="text-white">
            {{ t("Buttons.Test") }}
          </InputBtn>
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
  CheckIcon,
  BeakerIcon,
  ExclamationCircleIcon,
  PlayIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  examples: { type: Array as PropType<any>, default: [] },
  code: { type: String, default: "" },
  environment: { type: String, default: "" },
  challengeId: { type: String, default: "" },
  codingChallengeId: { type: String, default: "" },
});

const { t } = useI18n();
const duplicateExamples: any = ref([]);

function getExampleIndexById(id: any) {
  return duplicateExamples.value.findIndex((example: any) => example.id == id);
}

async function TestAgainstMe(id: any) {
  if (id == undefined || !!!id)
    return openSnackbar("info", "Headings.CannotTestForThisExample");
  // setLoading(true);
  duplicateExamples.value.forEach((example: any) => {
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
  // setLoading(false);
  duplicateExamples.value.forEach((example: any) => {
    if (example.id == id) example.loading = false;
  });
  success ? successHandler(success, id) : errorHandler(error);
}

async function testAgainstAll() {
  if (!props.examples.length) return;
  let promisesArray: any = [];
  props.examples.forEach(async (example: any) => {
    promisesArray.push(await TestAgainstMe(example.id));
  });
  await Promise.all(promisesArray);
}

function resetExamples() {
  duplicateExamples.value.map((example: any) => {
    example.solved = "pending";
    example.stderr = "";
    example.stdout = "";
  });
}

function successHandler(success: any, id: any) {
  let atIndex: number = getExampleIndexById(id);

  if (!!success.compile) {
    duplicateExamples.value[atIndex].stderr =
      success.compile?.stderr ?? "";
    duplicateExamples.value[atIndex].stdout =
      success.compile?.stdout ?? "";
  } else if (!!success.run) {
    duplicateExamples.value[atIndex].stderr =
      success.run?.stderr ?? "";
    duplicateExamples.value[atIndex].stdout =
      success.run?.stdout ?? "";
  }

  if (success?.verdict == "OK") {
    duplicateExamples.value[atIndex].solved = "solved";
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

  duplicateExamples.value[atIndex].solved =
    verdictMapping[success?.verdict] || null;
}

function errorHandler(error: any) {
  openSnackbar("error", error);
}

watch(
  () => props.examples,
  (newValue: any, oldValue: any) => {
    if (!newValue.length) return;
    console.log("watching");
    duplicateExamples.value = newValue.map((element: any) => {
      element.solved = "pending";
      element.stdout = "";
      element.stderr = "";
      element.loading = false;
    });
    duplicateExamples.value = newValue;
  }
);
</script>
