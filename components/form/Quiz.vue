<template>
  <div class="flex flex-col">
    <NoteBoard
      class="mb-10"
      :heading="'Headings.NoteCannotEditQuiz'"
      :content="'Body.NoteCannotEditQuiz'"
      :-note-type="'error'"
      v-if="!!!user?.admin && !!data"
    />
    <form
      class="flex flex-col gap-box"
      :class="{ 'form-submitting': form.submitting }"
      @submit.prevent="onclickSubmitForm()"
      ref="refForm"
    >
      <Input
        :label="t('Inputs.Question')"
        :placeholder="'Body.QuizDummyQuestion'"
        v-model="form.question.value"
        :class="canEdit ? '' : 'pointer-events-none opacity-60'"
        @valid="form.question.valid = $event"
        :rules="form.question.rules"
      />

      <Btn
        :class="canEdit ? '' : 'pointer-events-none opacity-60'"
        @click="onclickAddOption"
        class="w-fit self-end"
        >Add Option</Btn
      >

      <article
        :class="canEdit ? '' : 'pointer-events-none opacity-60'"
        class="flex gap-card items-center"
        v-for="(option, i) of options"
        :key="option?.id ?? i"
      >
        <Input
          :label="t('Inputs.Option')"
          :placeholder="option?.placeholder"
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
    </form>
    <InputBtn
      :loading="form.submitting"
      class="self-center"
      @click="onclickSubmitForm()"
      mt
      v-if="!!user?.admin || !!!data"
    >
      <span v-if="!!!data">{{ t("Buttons.CreateQuiz") }} </span>
      <span v-else-if="user.admin">{{ t("Buttons.UpdateQuiz") }} </span>
    </InputBtn>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";
import { XMarkIcon } from "@heroicons/vue/24/solid";
import {
  updateSubTaskInQuizForUser,
  updateSubTaskInQuizForAdmin,
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
      single_choice: { value: false, valid: true },

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

        options.value.forEach((option: any) => {
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

        let mappedOptions = options.value.map((option: any) => {
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
    const options: any = ref([
      {
        answer: "",
        placeholder: "Headings.HTML",
        valid: false,
        correct: false,
      },
      {
        answer: "",
        placeholder: "Headings.Python",
        valid: false,
        correct: true,
      },
      {
        answer: "",
        placeholder: "Headings.PowerPoint",
        valid: false,
        correct: false,
      },
      {
        answer: "",
        placeholder: "Headings.Excel",
        valid: false,
        correct: false,
      },
    ]);

    function onclickAddOption() {
      let isAllowed = true;
      if (options.value.length > 0) {
        let lastAddedOption = options.value[options.value.length - 1].answer;
        if (!!!lastAddedOption) isAllowed = false;
      }

      if (!isAllowed) {
        openSnackbar(
          "error",
          "Please fill current option first before adding new option."
        );
        return;
      }

      options.value.push({
        answer: "",
        valid: false,
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.Option"],
        correct: false,
      });
    }

    function onclickRemoveOption(index: number) {
      options.value.splice(index, 1);
    }

    function setOptionCorrect(status: boolean, index: number) {
      if (selectedQuestionType.value == "Multi Choice" || status == false) {
        options.value.splice(index, 1, {
          ...options.value[index],
          correct: status,
        });
        return;
      }

      let arr = options.value;

      arr = arr.map((o: any, i: any) => {
        return i == index ? { ...o, correct: true } : { ...o, correct: false };
      });

      arr.forEach((o: any) => {
        options.value.pop();
      });

      arr.forEach((o: any) => {
        options.value.push(o);
      });
    }

    const selectedQuestionType = ref("Multi Choice");

    function setFormData(data: any) {
      console.log("set form data");
      if (!!!data) return;
      form.question.value = data.question ?? "";
      form.question.valid = !!form.question.value;

      if (data?.single_choice) {
        selectedQuestionType.value = "Single Choice";
        form.single_choice.value = true;
      } else {
        selectedQuestionType.value = "Multi Choice";
        form.single_choice.value = false;
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

      options.value = [];
      Object.assign(options.value, [...arr]);
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
        var currentItem = array[i].toLowerCase();

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
        if (options.value.length <= 1) {
          console.log("options", options.value);
          openSnackbar("error", "Error.MinimumTwoOptionsForQuiz");
          return;
        }
        if (!hasTrueOption(options.value)) {
          return openSnackbar("error", "Error.OneCorrectOptionIsMust");
        }
        if (hasDuplicates(options.value))
          return openSnackbar("error", "Error.OptionsCannotBeSame");
        for (let i = 0; i < options.value.length; i++) {
          if (options.value[i].answer.length > 256) {
            return openSnackbar("error", t("Error.CannotHaveMoreCharacters", { input: t("Inputs.AnswerOption"), max: 256 }));
          }
        }
        if (form.question.value.length > 4096) {
          return openSnackbar("error", t("Error.CannotHaveMoreCharacters", { input: t("Inputs.Question"), max: 4096 }));
        }
        if (checkIsSingleChoice(options.value)) {
          form.single_choice.value = true;
        } else {
          form.single_choice.value = false;
        }

        if (!!!props.data) {
          fnCreateSubTask();
        } else {
          if (!user?.value.admin) fnEditSubTaskForUser();
          else fnEditSubTaskForAdmin();
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
        coins: 0,
        xp: 5,
        single_choice: form.body().single_choice,
      });
      form.submitting = false;

      success ? successHandler(success) : errorHandler(error);
    }

    async function fnEditSubTaskForUser() {
      form.submitting = true;
      if (!user.value.admin) {
      }
      const [success, error] = await updateSubTaskInQuizForUser(
        props.taskId,
        props.data?.id,
        {
          // answers: form.body().answers,
          // question: form.body().question,
          // single_choice: form.body().single_choice,
        }
      );
      form.submitting = false;
      !!success
        ? openSnackbar("success", "Success.UpdatedQuiz")
        : openSnackbar("error", "error.UpdatedQuiz");
    }

    async function fnEditSubTaskForAdmin() {
      form.submitting = true;
      if (!user.value.admin) {
      }
      const [success, error] = await updateSubTaskInQuizForAdmin(
        props.taskId,
        props.data?.id,
        {
          answers: form.body().answers,
          question: form.body().question,
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
      console.log("error isssssssss", res);
      openSnackbar("error", res ?? "");
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

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      onclickAddOption,
      options,
      XMarkIcon,
      onclickRemoveOption,
      selectedQuestionType,
      setOptionCorrect,
      user,
      canEdit,
    };
  },
});
</script>

<style scoped></style>
