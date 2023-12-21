<template>
  <div>
    <SkeletonSolveMatching v-if="!!!data" />
    <section v-else-if="!!data">
      <p class="mb-4 mt-8">{{ t("Headings.DragAndDropToMatchMatchings") }}</p>

      <section class="grid grid-cols-2 gap-x-1 sm:gap-x-3">
        <div>
          <article
            class="flex items-center w-full gap-1 sm:gap-3"
            v-for="(left, i) of data.left"
            :key="i"
          >
            <p
              class="text-xs sm:text-base px-2 sm:px-4 py-2 rounded-md my-2 border-4 border-tertiary text-white w-full max-h-20 overflow-y-scroll items-center"
            >
              {{ left }}
            </p>
            <ArrowRightIcon class="w-8 h-8 text-accent" />
          </article>
        </div>

        <div>
          <draggable
            :touchStartThreshold="1000"
            v-model="newRight"
            :group="{ name: 'right' }"
            handle=".handler"
            :animation="300"
          >
            <template #item="{ element }">
              <article class="flex items-center w-full gap-1 sm:gap-3">
                <p
                  class="text-xs sm:text-base px-2 sm:px-4 py-2 rounded-md my-2 border-4 border-tertiary text-white w-full max-h-20 overflow-y-scroll items-center"
                >
                  {{ element?.title ?? "" }}
                </p>
                <Bars3Icon class="h-7 w-7 text-accent cursor-pointer handler" />
              </article>
            </template>
          </draggable>
        </div>
      </section>
      <div>
        <InputBtn
          class="mt-8"
          v-if="data?.solved || user?.id == data?.creator"
          full
          @click="nextQuestion()"
          iconRight
          :icon="ChevronDoubleRightIcon"
        >
          {{ t("Buttons.Next") }}
        </InputBtn>

        <InputBtnWithHeart
          full
          v-if="!data?.solved && user?.id != data?.creator && !isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
          iconRight
          mt
          :icon="HalfHeart"
        >
          {{ t("Buttons.SubmitAnswer") }}
        </InputBtnWithHeart>

        <InputBtn
          full
          v-if="!data?.solved && user?.id != data?.creator && isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
          mt
        >
          {{ t("Buttons.SubmitAnswer") }}
        </InputBtn>
      </div>
      <InputQuizRating
        class="my-3"
        :data="data"
        :subtask="data"
        @rated="fnRated($event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import {
  FlagIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  Bars3Icon,
} from "@heroicons/vue/24/outline";
import { ChevronDoubleRightIcon } from "@heroicons/vue/24/solid";
import HalfHeart from "../svg/HalfHeart.vue";

const props = defineProps({
  data: { type: Object as PropType<any>, default: null },
});
const emits = defineEmits([
  "solved",
  "updateQuestion",
  "rated",
  "nextQuestion",
]);

const { t } = useI18n();
const formSubmitting = ref(false);
const user: any = useUser();
const premiumInfo: any = usePremiumInfo();
const newRight: any = ref([]);
const solution: any = ref([]);

const isPremium = computed(() => {
  return premiumInfo.value?.premium;
});

function setSolution() {
  newRight.value.forEach((item: any, i: any) => {
    solution.value[i] = item.isAt;
  });
}

async function onclickSubmitForm() {
  setSolution();
  console.log("solutiuon", solution.value);

  if (props.data.solved == true || props.data?.creator == user.value?.id)
    return;
  formSubmitting.value = true;
  const [success, error] = await solveMatching(
    props.data.task_id,
    props.data.id,
    {
      answer: solution.value,
    }
  );
  formSubmitting.value = false;
  await getHearts();
  if (success == true || success == false) successHandler(success);
  else errorHandler(error);
}

function successHandler(res: any) {
  if (!!res) {
    emits("solved", props.data.id);
    openSnackbar("success", "Success.SolvedMatching");
    console.log("res", res);
  } else {
    openSnackbar("error", "Error.WrongMatchingAttempt");
  }
}

function errorHandler(error: any) {
  console.log("error", error);
  openSnackbar("error", error);
}

function nextQuestion() {
  emits("nextQuestion", props.data.id);
}

function fnRated(id: any) {
  emits("rated", id);
}

function setData() {
  solution.value.length = 0;
  newRight.value.length = 0;
  props.data.right.forEach((item: any, i: any) => {
    solution.value.push(i);
    let j = {
      title: item,
      isAt: i,
    };
    newRight.value.push(j);
  });
}
watch(
  () => props.data,
  () => {
    if (!!props.data) setData();
  },
  { deep: true }
);

onMounted(() => {
  if (!!props.data) setData();
});
</script>

<style scoped></style>
