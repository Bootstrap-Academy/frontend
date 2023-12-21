<template>
  <div class="flex flex-col">
    <NoteBoard
      class="mb-10"
      :heading="'Headings.NoteCannotEditMatching'"
      :content="'Body.NoteCannotEditMatching'"
      :-note-type="'error'"
      v-if="!!data"
    />

    <section class="grid grid-cols-1 md:grid-cols-2 gap-10 w-full mt-10">
      <article>
        <p class="text-accent">
          {{ t("Headings.LabelForMatchings") }}
        </p>
        <div class="py-5">
          <div
            v-for="i of matchingsLength"
            :key="i"
            class="md:flex gap-10 items-center"
          >
            <p class="md:hidden">{{ alphabetIs(i) }}:</p>
            <Input :rules="rules" v-model="left[i - 1]" class="w-full" />
            <ArrowRightIcon class="h-8 w-8 -mt-4 text-accent hidden md:block" />
          </div>
        </div>
      </article>

      <article>
        <p class="text-accent">
          {{ t("Headings.AnswersForMatchingsRespectively") }}
        </p>
        <div class="py-5">
          <div v-for="i of matchingsLength" :key="i">
            <P class="md:hidden">{{ alphabetIs(i) }}:</P>
            <div class="flex gap-3 w-full items-center">
              <Input :rules="rules" v-model="right[i - 1]" class="w-full" />
              <TrashIcon
                v-if="!!!data"
                @click="removeMatching(i)"
                class="h-6 w-6 cursor-pointer text-accent -mt-4"
              />
            </div>
          </div>
        </div>
      </article>
    </section>
    <div v-if="!!!data">
      <PlusCircleIcon
        class="h-7 w-7 text-accent cursor-pointer"
        @click="addNewMatching()"
      />
    </div>
    <!-- <p>
      {{ left }}
    </p>
    ss
    <p>
      {{ right }}
    </p>
    <p>{{ solution }}</p>
    <p>{{ matchingsLength }}</p> -->

    <InputBtn
      :loading="loading"
      @click="fnCreateMatching()"
      class="self-center"
      mt
      v-if="!data"
    >
      <span v-if="!!!data">{{ t("Buttons.CreateMatching") }} </span>
      <span v-else-if="user.admin">{{ t("Buttons.UpdateMatching") }} </span>
    </InputBtn>
  </div>
</template>

<script setup lang="ts">
import { PlusCircleIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { ArrowRightIcon } from "@heroicons/vue/24/solid";
import type { PropType } from "nuxt/dist/app/compat/capi";
import { useI18n } from "vue-i18n";
import { useDialogSlot } from "~~/composables/dialogSlot";
import type {
  matching as matchingType,
  matchingOptionArray,
  matchingSolutionArray,
} from "~~/types/matching";
const props = defineProps({
  taskId: { type: String, default: "" },
  data: { type: Object as PropType<matchingType>, default: null },
});

const { t } = useI18n();
const dialogCreateMatching = useDialogCreateMatching();
const dialog = useDialogSlot();
const loading = ref(false);

const user: any = useUser();
const matching: Ref<matchingType | null> = useMatching();
const matchingsLength = ref(4);
const left = ref<matchingOptionArray>([]);
const right = ref<matchingOptionArray>([]);
const solution = ref<matchingSolutionArray>([]);

const rules = ref([
  (v: String) => v.length <= 256 || "Maximum 256 Characters are Allowed",
  (v: String) => !!v || "Required!",
]);

function shuffleArrays(A: matchingOptionArray) {
  A = [...A];
  let solutionArr: any = [];

  // creating array of object with user inputed string and index of that string in array
  let arr: any = A.map((element, index) => {
    return { element, index };
  });

  // shuffling array
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // creating solutionArr according to out arr shuffled
  arr.forEach((element: any, i: number) => {
    solutionArr[element.index] = i;
  });

  // restore only string elements from object Array
  arr = arr.map((element: any) => {
    return element.element;
  });

  return [arr, solutionArr];
}

function restoreArraysPattern(
  stringArray: matchingOptionArray,
  numberArray: matchingSolutionArray
) {
  // Combine the string and number arrays into an array of objects
  // const combinedArray = stringArray.map((str: string, index: number) => ({
  //   string: str,
  //   number: numberArray[index],
  // }));

  // // Sort the combined array based on the 'number' property
  // combinedArray.sort((a: any, b: any) => a.number - b.number);

  // // Split the sorted array back into separate arrays
  // const restoredStringArray = combinedArray.map((obj: any) => obj.string);
  // const restoredNumberArray = combinedArray.map((obj: any) => obj.number);

  // return [restoredStringArray, restoredNumberArray];

  let copiedStringArray: any = [...stringArray];
  let copiedNumberArray: any = [...numberArray];

  numberArray.forEach((number: any, index: any) => {
    copiedStringArray[index] = stringArray[number];
    copiedNumberArray[index] = index;
  });
  return [copiedStringArray, copiedNumberArray];
}

const hasDuplicate = (array: Array<string>) => {
  const seen: { [key: string]: number | Boolean } = {};

  for (const item of array) {
    if (seen[item]) {
      return true;
    }
    seen[item] = true;
  }

  return false;
};

const IsAnyEmptyIndex = (array: Array<string>) => {
  let valid = true;
  array.forEach((element: string) => {
    if (!!!element || element == null) valid = false;
  });
  if (valid) return false;
  else return true;
};

function alphabetIs(number: number) {
  switch (number) {
  case 1: {
    return "A";
  }
  case 2: {
    return "B";
  }
  case 3: {
    return "C";
  }
  case 4: {
    return "D";
  }
  case 5: {
    return "E";
  }
  case 6: {
    return "F";
  }
  case 7: {
    return "G";
  }
  case 8: {
    return "H";
  }
  case 9: {
    return "I";
  }
  }
}

function addNewMatching() {
  matchingsLength.value += 1;
}

function removeMatching(i: number) {
  if (matchingsLength.value <= 2) {
    return openSnackbar("info", "Error.MinimnumTwoFieldsRequired");
  }

  i -= 1;
  left.value.splice(i, 1);
  right.value.splice(i, 1);
  solution.value.splice(i, 1);
  matchingsLength.value -= 1;
}

async function fnCreateMatching() {
  if (IsAnyEmptyIndex(left.value) || IsAnyEmptyIndex(right.value)) {
    return openSnackbar("error", "Fill Matchings Correctly");
  }

  if (hasDuplicate(right.value) || hasDuplicate(left.value)) {
    return openSnackbar("error", "Matchings cannot contain duplicates");
  }

  const [rightArray, solutionArray] = shuffleArrays(right.value);

  console.log("right value array", rightArray);
  console.log("silution value", solutionArray);

  const body = {
    solution: solutionArray,
    right: rightArray,
    left: left.value,
  };
  loading.value = true;
  const [success, error] = await createMatching(body, props.taskId);
  loading.value = false;
  if (success) {
    dialog.value = false;
    dialogCreateMatching.value = false;
    openSnackbar("success", "Success.CreateMatching");
  } else if (!!error) {
    console.log("in errorrrrrrr", error);
    openSnackbar("error", error);
  }
}

watch(
  () => matchingsLength.value,
  (newValue, oldValue) => {
    solution.value = [];
    if (!!!props.data) {
      for (let index = 0; index < newValue; index++) {
        solution.value.push(index);
        left.value[index] = left.value[index] ?? "";
        right.value[index] = right.value[index] ?? "";
      }
    }
  },
  { immediate: true }
);

watch(
  () => matching.value,
  () => {
    if (!!matching.value) {
      left.value = matching.value.left;
      const [restoredStringArray, restoredNumberArray] = restoreArraysPattern(
        matching.value.right,
        matching.value.solution
      );

      right.value = restoredStringArray;
      solution.value = restoredNumberArray;
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => props.data,
  async (newValue, oldValue) => {
    if (!!!newValue) return;
    matchingsLength.value = newValue.left.length;
    await getMatchingAndSolution(newValue.id, newValue.task_id);
  },
  { deep: true, immediate: true }
);
</script>

<style scoped></style>
