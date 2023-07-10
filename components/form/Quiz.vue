<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <Input
      :label="t('Inputs.Question')"
      v-model="form.question.value"
      :class="canEdit ? '' : 'pointer-events-none opacity-25'"
      @valid="form.question.valid = $event"
      :rules="form.question.rules"
    />
    <div class="grid md:grid-cols-2 md:gap-8">
      <Input
        v-if="!!user?.admin"
        :label="t('Inputs.Morphcoins')"
        v-model="form.coin.value"
        :type="'number'"
        @valid="form.coin.valid = $event"
        :rules="form.coin.rules"
      />
      <Input
        v-if="!!user?.admin"
        :label="t('Inputs.Xp')"
        v-model="form.xp.value"
        :type="'number'"
        @valid="form.xp.valid = $event"
        :rules="form.xp.rules"
      />
    </div>
    <div class="flex items-center gap-card">
      <label class="text-body-2 text-body font-body block mb-2">
        {{ t("Inputs.Payed") }}
      </label>
      <InputSwitch v-model="form.payed.value" />
    </div>

    <Input
      v-if="form.payed.value"
      :label="t('Inputs.Fee')"
      :type="'number'"
      v-model="form.fee.value"
      @valid="form.fee.valid = $event"
      :rules="form.fee.rules"
    />

    <!-- <article class="flex flex-wrap gap-card">
      <button
        type="button"
        v-for="questionType of questionTypes"
        :key="questionType.value"
        @click="onclickSetQuestionType(questionType.value)"
        class="w-40 h-20 border-2 border-info style-card"
        :class="
          selectedQuestionType == questionType.value
            ? 'text-white bg-info'
            : 'text-white'
        "
      >
        {{ t(questionType.label) }}
      </button>
    </article> -->
    <Btn
      :class="canEdit ? '' : 'pointer-events-none opacity-25'"
      @click="onclickAddOption"
      class="w-fit self-end"
      >Add Option</Btn
    >

    <article
      :class="canEdit ? '' : 'pointer-events-none opacity-25'"
      class="flex gap-card items-center"
      v-for="(option, i) of options"
      :key="option?.id ?? i"
    >
      <Input
        :label="t('Inputs.Option')"
        v-model="option.answer"
        @valid="option.valid = $event"
        :rules="option.rules"
        class="w-full"
      />
      <div>
        <label class="text-body-2 text-body font-body block mb-2">
          {{ t("Inputs.Correct") }}
        </label>
        <InputSwitch
          :model-value="option.correct"
          @update:model-value="setOptionCorrect($event, i)"
        />
      </div>

      <Icon
        :icon="XMarkIcon"
        class="cursor-pointer"
        @click="onclickRemoveOption(i)"
      />
    </article>

    <InputBtn
      :loading="form.submitting"
      class="self-center"
      @click="onclickSubmitForm()"
      mt
    >
      <span v-if="!!!data">{{ t("Buttons.CreateQuiz") }} </span>
      <span v-else>{{ t("Buttons.UpdateQuiz") }} </span>
    </InputBtn>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { IForm } from "~/types/form";
import { XMarkIcon } from "@heroicons/vue/24/solid";
import {
  createSubTaskInQuiz,
  getSubTaskAndSolutionInQuiz,
} from "~~/composables/quizzes";

export default defineComponent({
  components: { XMarkIcon },
  props: {
    data: { type: Object, default: null },
    taskId: { type: String, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const dialogSlot = useDialogSlot();
    const dialogCreateSubtask = useDialogCreateSubtask();
    const user: any = useUser();
    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    const canEdit = computed(() => {
      if (props.data != null) {
        if (user.value?.admin) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    });
    // ============================================================= reactive
    const form = reactive<IForm>({
      question: {
        valid: false,
        value: "",
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.Question"],
      },
      payed: {
        valid: true,
        value: 0,
        rules: [],
      },
      fee: {
        valid: true,
        value: 0,
        rules: [
          (v: number) => v >= 0 || "Error.InputMinNumber_0",
          (v: number) =>
            v <= maxFee.value || `Error.InputMaxNumber_${maxFee.value}`,
        ],
      },
      single_choice: { value: false, valid: true },
      coin: {
        valid: true,
        value: 0,
        rules: [
          // (v: number) => !!v || "Error.InputEmpty_Inputs.Coins",
          (v: number) => v >= 0 || "Error.InputMinNumber_0",
          // (v: number) => v <= 100 || "Error.InputMaxNumber_100",
        ],
      },
      xp: {
        valid: true,
        value: 0,
        rules: [
          // (v: number) => !!v || "Error.InputEmpty_Inputs.Xp",
          (v: number) => v >= 0 || "Error.InputMinNumber_0",
          // (v: number) => v <= 100 || "Error.InputMaxNumber_100",
        ],
      },

      submitting: false,
      validate: () => {
        let isValid = true;

        for (const key in form) {
          if (
            key != "validate" &&
            key != "body" &&
            key != "submitting" &&
            !form[key].valid
          ) {
            isValid = false;
          }
        }

        options.forEach((option) => {
          if (option.valid == false) isValid = false;
        });

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },
      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != "validate" && key != "body" && key != "submitting")
            obj[key] = form[key].value;
        }

        let mappedOptions = options.map((option) => {
          return {
            answer: option.answer,
            correct: option.correct,
            id: `Option-${getRandomNumber(0, 32432424324)}-${Date.now()}`,
          };
        });
        return { ...obj, answers: mappedOptions };
      },
    });

    // ============================================================= options
    const options: any[] = reactive([]);

    function onclickAddOption() {
      let isAllowed = true;
      if (options.length > 0) {
        let lastAddedOption = options[options.length - 1].answer;
        if (!!!lastAddedOption) isAllowed = false;
      }

      if (!isAllowed) {
        openSnackbar(
          "error",
          "Please fill current option first before adding new option."
        );
        return;
      }

      options.push({
        answer: "",
        valid: false,
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.Option"],
        correct: false,
      });
    }

    function onclickRemoveOption(index: number) {
      options.splice(index, 1);
    }

    function setOptionCorrect(status: boolean, index: number) {
      if (selectedQuestionType.value == "Multi Choice" || status == false) {
        options.splice(index, 1, { ...options[index], correct: status });
        return;
      }

      let arr = options;

      arr = arr.map((o, i) => {
        return i == index ? { ...o, correct: true } : { ...o, correct: false };
      });

      arr.forEach((o) => {
        options.pop();
      });

      arr.forEach((o) => {
        options.push(o);
      });
    }

    const questionTypes = [
      {
        label: "Headings.MultiChoice",
        value: "Multi Choice",
      },
      {
        label: "Headings.SingleChoice",
        value: "Single Choice",
      },
    ];

    const maxFee: any = computed(() => {
      if (!!!user?.value?.admin) {
        return 1;
      } else return 1000000000;
    });

    const selectedQuestionType = ref("Multi Choice");

    function onclickSetQuestionType(type: string) {
      selectedQuestionType.value = type;
      if (type == "Multi Choice") {
        form.single_choice.value = false;
        return;
      } else {
        form.single_choice.value = true;
      }
      if (options.length <= 0) return;

      let listOfCorrectOptionIndex = [];

      options.forEach((option, index) => {
        if (option.correct == true) {
          listOfCorrectOptionIndex.push(index);
        }
      });

      if (listOfCorrectOptionIndex.length <= 1) return;

      for (let i = 1; i < listOfCorrectOptionIndex.length; i++) {
        options.splice(i, 1, { ...options[i], correct: false });
      }
    }
    // ============================================================= ids

    function setFormData(data: any) {
      if (!!!data) return;
      form.question.value = data.question ?? "";
      form.coin.value = data.coins ?? "";
      form.xp.value = data.xp ?? "";
      form.question.valid = !!form.question.value;

      if (data?.single_choice) {
        selectedQuestionType.value = "Single Choice";
        form.single_choice.value = true;
      } else {
        selectedQuestionType.value = "Multi Choice";
        form.single_choice.value = false;
      }

      if (data?.fee <= 0) {
        form.payed.value = false;
      } else {
        form.payed.value = true;
        form.fee.value = data?.fee ?? 0;
      }

      let arr = data?.answers ?? [];
      if (arr.length > 0) {
        arr = arr.map((option: any) => {
          return {
            answer: option.answer,
            valid: !!option.answer,
            rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.Option"],
            correct: option.correct,
          };
        });
      }

      Object.assign(options, [...arr]);
    }

    // ============================================================= functions
    function hasDuplicates(array: any) {
      let arrayDuplicated: any = [];
      array.forEach((element: any) => {
        arrayDuplicated.push(element.answer);
      });
      array = arrayDuplicated;

      var encounteredItems: any = {};

      for (var i = 0; i < array.length; i++) {
        var currentItem = array[i];

        // Convert the item to a string before using it as an object key
        var currentItemString = String(currentItem);

        // If the item already exists in the object, it's a duplicate
        if (encounteredItems[currentItemString]) {
          return true;
        }

        // Mark the item as encountered
        encounteredItems[currentItemString] = true;
      }

      // No duplicates found
      return false;
    }
    function hasTrueOption(arr: any) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].correct === true) {
          return true;
        }
      }
      return false;
    }

    function checkIsSingleChoice(arr: any) {
      let trueAre = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].correct === true) {
          ++trueAre;
          console.log("true");
        }
      }

      if (trueAre == 1) {
        return true;
      } else if (trueAre > 1) {
        return false;
      }
    }
    async function onclickSubmitForm() {
      if (form.validate()) {
        if (options.length <= 1) {
          console.log("options", options);
          openSnackbar("error", "Error.MinimumTwoOptionsForQuiz");
          return;
        }
        if (!hasTrueOption(options)) {
          return openSnackbar("error", "Error.OneCorrectOptionIsMust");
        }
        if (hasDuplicates(options))
          return openSnackbar("error", "Error.OptionsCannotBeSame");
        if (checkIsSingleChoice(options)) {
          form.single_choice.value = true;
        } else {
          form.single_choice.value = false;
        }

        if (!!!props.data) {
          fnCreateSubTask();
        } else {
          fnEditSubTask();
        }
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    async function fnCreateSubTask() {
      form.submitting = true;
      const [success, error] = await createSubTaskInQuiz(props.taskId, {
        answers: form.body().answers,
        question: form.body().question,
        coins: !!form.body().coin ? form.body().coin : 0,
        xp: !!form.body().xp ? form.body().xp : 0,
        fee: !!form.body().fee ? form.body().fee : 0,
        single_choice: form.body().single_choice,
      });
      form.submitting = false;

      success ? successHandler(success) : errorHandler(error);
    }
    async function fnEditSubTask() {
      form.submitting = true;
      const [success, error] = await updateSubTaskInQuiz(
        props.taskId,
        props.data?.id,
        {
          answers: form.body().answers,
          question: form.body().question,
          coins: !!form.body().coin ? form.body().coin : 0,
          xp: !!form.body().xp ? form.body().xp : 0,
          fee: !!form.body().fee ? form.body().fee : 0,
          single_choice: form.body().single_choice,
        }
      );
      form.submitting = false;
      !!success
        ? openSnackbar("success", "Success.UpdatedQuiz")
        : openSnackbar("error", "error.UpdatedQuiz");
    }

    function successHandler(res: any) {
      openSnackbar("success", "Success.CreatedQuiz");
      dialogCreateSubtask.value = false;
      dialogSlot.value = false;
    }

    function errorHandler(res: any) {
      openSnackbar("error", res?.detail ?? "");
    }

    watch(
      () => props.data,
      async (newValue, oldValue) => {
        if (!!!props.data) return;
        setLoading(true);
        const [success, error] = await getSubTaskAndSolutionInQuiz(
          props.taskId,
          newValue?.id
        );
        setLoading(false);
        if (success) setFormData(success);
        else openSnackbar("error", error);
      },
      { immediate: true, deep: true }
    );

    watch(
      () => form.payed.value,
      async (newValue, oldValue) => {
        if (newValue) {
          form.fee.value = 0;
        }
      },
      { immediate: true, deep: true }
    );

    onMounted(async () => {});

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      onclickAddOption,
      options,
      XMarkIcon,
      onclickRemoveOption,
      questionTypes,
      selectedQuestionType,
      onclickSetQuestionType,
      setOptionCorrect,
      user,
      canEdit,
    };
  },
});
</script>

<style scoped></style>
