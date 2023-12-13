<template>
  <div>
    <!-- <p>{{ duplicateExamples ?? "" }}</p> -->
    <div class="flex justify-between items-center mb-10">
      <div class="flex items-center gap-2">
        <p>{{ t("Headings.Examples") }}:</p>
        <Tooltip
          :heading="'Headings.ResetExamples'"
          :placement="'right'"
          @click="resetExamples()"
        >
          <ArrowPathIcon
            class="h-5 w-5 text-accent cursor-pointer hover:rotate-180 transition-all duration-700"
          />
        </Tooltip>
      </div>
      <Btn @click="testAgainstAll()">{{ t("Buttons.TestAgainstAll") }}</Btn>
    </div>

    <section
      class="relative"
      v-for="(example, i) of duplicateExamples"
      :key="i"
    >
      <div
        class="bg-light my-3 card-sm rounded-md"
        :class="{
          'border border-light': example.solved == 'pending',
          'border border-success': example.solved == 'solved',
          'border border-error': example.solved != 'solved',
        }"
      >
        <p class="text-white text-md">
          {{ t("Headings.Example") }} {{ i + 1 }}
        </p>

        <div
          v-if="example.solved == 'solved' && example.solved != 'pending'"
          class="flex items-center gap-2"
        >
          <p class="text-sm capitalize text-success mt-2">
            Example Test Passed
          </p>
          <CheckCircleIcon class="h-5 w-5 text-accent -mb-2.5" />
        </div>
        <p
          class="text-sm capitalize text-error mt-2"
          v-if="example.solved != 'solved' && example.solved != 'pending'"
        >
          Error:
          {{
            example.solved == null
              ? "There is no output for your provided code"
              : t(example.solved)
          }}
        </p>

        <article class="mt-3">
          <p class="text-white">
            {{ t("Headings.Input") }}
          </p>
          <p class="whitespace-pre">{{ example?.input ?? '' }}</p>

          <p class="text-white mt-4">
            {{ t("Headings.ExpectedOutput") }}
          </p>
          <p class="whitespace-pre">{{ example?.output ?? '' }}</p>
        </article>

        <p v-if="!!example?.stderr" class="mt-3">
          <span class="text-error"> {{ t("Headings.ExampleError") }}: </span>

          <p class="whitespace-pre">{{ example?.stderr ?? '' }}</p>
        </p>
        <p v-if="!!example?.stdout">
          <span class="block text-success">
            {{ t("Headings.ActualOutput") }}:
          </span>

          <p class="whitespace-pre">{{ example?.stdout ?? '' }}</p>
        </p>

        <p v-if="example?.explanation" class="my-5 text-sm">
          Explanation:
          {{ example?.explanation ?? "" }}
        </p>

        <div class="flex justify-end">
          <InputBtn
            secondary
            :loading="example.loading"
            @click="TestAgainstMe(example.id)"
            sm
            class="text-white"
            >{{ t("Buttons.ExamplesTestMe") }}</InputBtn
          >
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
  let atIndex: any;
  duplicateExamples.value.forEach((element: any, index: any) => {
    if (element.id == id) atIndex = index;
  });

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
  let atIndex: any;
  duplicateExamples.value.forEach((element: any, i: any) => {
    if (element.id == id) atIndex = i;
  });
  switch (success?.verdict) {
  case "COMPILATION_ERROR":
    duplicateExamples.value[atIndex].solved =
        "Error.Verdict.COMPILATION_ERROR";
    break;
  case "INVALID_OUTPUT_FORMAT":
    duplicateExamples.value[atIndex].solved =
        "Error.Verdict.INVALID_OUTPUT_FORMAT";
    break;
  case "MEMORY_LIMIT_EXCEEDED":
    duplicateExamples.value[atIndex].solved =
        "Error.Verdict.MEMORY_LIMIT_EXCEEDED";
    break;
  case "NO_OUTPUT":
    duplicateExamples.value[atIndex].solved = "Error.Verdict.NO_OUTPUT";
    break;
  case "OK":
    duplicateExamples.value[atIndex].solved = "Error.Verdict.OK";
    break;
  case "PRE_CHECK_FAILED":
    duplicateExamples.value[atIndex].solved =
        "Error.Verdict.PRE_CHECK_FAILED";
    break;
  case "RUNTIME_ERROR":
    duplicateExamples.value[atIndex].solved = "Error.Verdict.RUNTIME_ERROR";
    break;
  case "TIME_LIMIT_EXCEEDED":
    duplicateExamples.value[atIndex].solved =
        "Error.Verdict.TIME_LIMIT_EXCEEDED";
    break;
  case "WRONG_ANSWER":
    duplicateExamples.value[atIndex].solved = "Error.Verdict.WRONG_ANSWER";
    break;

  default:
    duplicateExamples.value[atIndex].solved = null;
    break;
  }
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

<style scoped></style>
