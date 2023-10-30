<template>
  <div>
    <SkeletonFormCodingChallenge v-if="loadingData" />

    <section v-else>
      <NoteBoard
        class="mb-10"
        :heading="'Headings.NoteCannotEditCodingChallenge'"
        :content="'Body.NoteCannotEditCodingChallenge'"
        :-note-type="'error'"
        v-if="!!!user?.admin && !!propData"
      />
      <form
        class="flex flex-col gap-box"
        :class="{ 'form-submitting': form.submitting }"
        @submit.prevent="onclickSubmitForm()"
        ref="refForm"
      >
        <!-- <article class="grid sm:grid-cols-2 md:grid-cols-3 sm:gap-x-10">
        <Input
          v-if="!!user.admin"
          :label="t('Inputs.Morphcoins')"
          :type="'number'"
          :rules="form.coins.rules"
          v-model="form.coins.value"
          @valid="form.coins.valid = $event"
        />
        <Input
          v-if="!!user.admin"
          :label="t('Inputs.Xp')"
          :type="'number'"
          :rules="form.xp.rules"
          v-model="form.xp.value"
          @valid="form.xp.valid = $event"
        />
      </article> -->

        <InputTextarea
          :rows="10"
          :label="t('Inputs.Description')"
          v-model="form.description.value"
          @valid="form.description.valid = $event"
          :placeholder="form.description.placeholder"
          :rules="form.description.rules"
        />

        <article>
          <div class="flex gap-x-2 items-center">
            <p class="mb-2 ml-1">{{ t("Headings.EvaluatorCode") }}</p>
          </div>
          <ChallengesCodeEditor :selectedLanguage="'python'" class="h-full" v-model="form.evaluator.value" />
          <!-- error if there is any during evaluator code creation-->

          <div v-if="!!evaluatorCodeErrorDetails.stderr">
            <p class="text-error">{{ t("Headings.Error") }}</p>

            <p class="whitespace-pre text-error">{{ evaluatorCodeErrorDetails.stderr }}</p>
          </div>
          <div v-if="!!evaluatorCodeErrorDetails.stdout">
            <p class="text-accent">{{ t("Headings.Output") }}</p>
            <p class="whitespace-pre">{{ evaluatorCodeErrorDetails.stdout }}</p>
          </div>
        </article>

        <article>
          <div class="flex justify-end -mb-5">
            <InputSelect
              v-if="languages.length"
              :rules="form.solution_environment.rules"
              :label="t('Inputs.SolutionEnvironment')"
              :options="languages"
              btn-type
              v-model="form.solution_environment.value"
            />
          </div>
          <div class="flex gap-2 items-center">
            <p class="mb-2 ml-1">{{ t("Headings.SolutionCode") }}</p>
          </div>
          <ChallengesCodeEditor
            class="h-full"
            v-model="form.solution_code.value"
            :selectedLanguage="form.solution_environment.value"
          />

          <div
            @click="enterExampleCode()"
            class="text-xs text-accent justify-end -mt-4 cursor-pointer flex gap-2 items-center"
          >
            {{ t("Headings.ClickForExampleCode") }}
            <CodeBracketIcon class="h-5 w-5" />
          </div>
          <!-- error if there is any during create solution code -->
          <p v-if="!!SolutionCodeErrorDetails.verdict" class="mt-4">
            {{ t(SolutionCodeErrorDetails.verdict) }}
          </p>
          <p v-if="!!SolutionCodeErrorDetails.stderr" class="mt-4">
            <span class="block">{{ t("Headings.Error") }} </span>
            <p class="whitespace-pre text-error">{{ SolutionCodeErrorDetails.stderr }}</p>
          </p>
          <p v-if="!!SolutionCodeErrorDetails.stdout" class="mt-4">
            <span class="block text-accent">{{ t("Headings.Output") }}</span>
            <p class="whitespace-pre">{{ SolutionCodeErrorDetails.stdout }}</p>
          </p>
        </article>

        <section class="mt-10">
          <Transition name="popIn">
            <div v-if="advanceSettings">
              <article class="flex items-center gap-2">
                <p class="mb-3 text-lg">{{ t("Headings.Why") }}</p>
                <Tooltip
                  :placement="'right'"
                  :heading="'Headings.WhyWeUseThem'"
                  :content="'Body.WhyWeUseTests'"
                >
                  <InformationCircleIcon class="text-white h-6 w-6 -mt-2" />
                </Tooltip>
              </article>
              <article class="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                <Input
                  :label="t('Inputs.StaticTests')"
                  :type="'number'"
                  :rules="form.static_tests.rules"
                  :placeholder="form.static_tests.placeholder"
                  v-model="form.static_tests.value"
                  @valid="form.static_tests.valid = $event"
                />
                <Input
                  :label="t('Inputs.RandomTests')"
                  :type="'number'"
                  :rules="form.random_tests.rules"
                  :placeholder="form.random_tests.placeholder"
                  v-model="form.random_tests.value"
                  @valid="form.random_tests.valid = $event"
                />
              </article>
            </div>
          </Transition>

          <article class="flex justify-end">
            <div
              @click="advanceSettings = !advanceSettings"
              class="flex items-center gap-2 group cursor-pointer px-3 py-1 rounded-full w-fit bg-[#6448e433] hover:bg-[#5e41de4d]"
            >
              <Cog6ToothIcon
                class="text-white h-7 w-7 group-hover:animate-spin"
              />
              <p class="text-[#afa7dd]">
                {{ advanceSettings ? "Hide Settings" : "Advance Settings" }}
              </p>
            </div>
          </article>
        </section>

        <section
          v-if="!!!propData || user?.admin"
          class="flex gap-3 flex-wrap justify-end"
        >
          <InputBtn @click="closeDialog()" class="self-end" secondary mt>
            {{ t("Buttons.Close") }}
          </InputBtn>
          <InputBtn
            :loading="loading"
            class="self-end"
            @click="onclickSubmitForm()"
            mt
          >
            <span v-if="!!propData">
              {{ t("Buttons.UpdateCodingChallenge") }}
            </span>

            <span v-else>
              {{ t("Buttons.CreateCodingChallenge") }}
            </span>
          </InputBtn>
        </section>
      </form>
    </section>
  </div>
</template>

<script lang="ts">
import {
  InformationCircleIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  Cog8ToothIcon,
} from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import type { PropType } from "vue";
import {
  updateCodingChallenge,
  createCodingChallenge,
  getEvaluator,
  getSolution,
  getConfigs,
  useConfigs,
  getEnvironments,
  useEnvironments,
  useEvaluatorTemplate,
  getEvaluatorTemplate,
} from "~~/composables/codingChallenges";
import type { IForm } from "~/types/form";

export default {
  props: {
    propData: { type: Object as PropType<any>, default: null },
    challengeId: { type: String, default: "" },
  },
  components: {
    InformationCircleIcon,
    CodeBracketIcon,
    Cog6ToothIcon,
    Cog8ToothIcon,
  },
  setup(props) {
    const { t } = useI18n();
    const refForm = ref<HTMLFormElement | null>(null);
    const loading = ref(false);
    const configs: any = useConfigs();
    const user: any = useUser();
    const evaluatorTemplate = useEvaluatorTemplate();
    const isFirstTime = ref(true);
    const environments: any = useEnvironments();
    const loadingData = ref(true);
    const advanceSettings = ref(false);
    const SolutionCodeErrorDetails = ref({
      stdout: "",
      stderr: "",
      verdict: "",
    });
    const evaluatorCodeErrorDetails = ref({
      stdout: "",
      stderr: "",
    });
    const languages: any = computed(() => {
      const items = [];
      for (const key in environments?.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });

    const form = reactive<IForm>({
      description: {
        valid: false,
        value: "",
        placeholder: "Describe here what user have to solve?",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Description",
          (v: string) => v.length >= 10 || "Error.InputMinLength_10",
          (v: string) => v.length <= 4096 || "Error.InputMaxLength_4096",
        ],
      },
      // xp: {
      //   valid: true,
      //   value: null,
      //   rules: [(v: number) => v >= 0 || "Error.InputMinNumber_0"],
      // },
      // coins: {
      //   valid: true,
      //   value: null,
      //   rules: [(v: number) => v >= 0 || "Error.InputMinNumber_0"],
      // },

      static_tests: {
        valid: true,
        value: 5,
        placeholder: "",
        rules: [
          (v: number) => !!v || "Error.InputEmpty_Inputs.StaticTests",
          (v: number) => v <= 20 || "Error.InputMaxNumber_20",
        ],
      },
      random_tests: {
        valid: true,
        value: 5,
        placeholder: "",
        rules: [
          (v: number) => !!v || "Error.InputEmpty_Inputs.RandomTests",
          (v: number) => v <= 20 || "Error.InputMaxNumber_20",
        ],
      },
      solution_environment: {
        valid: true,
        value: "",
      },
      evaluator: {
        valid: true,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Evaluator",
          (v: string) => v.length <= 65536 || "Error.InputMaxNumber_65536",
        ],
      },
      solution_code: {
        valid: true,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.SolutionCode",
          (v: string) => v.length <= 65536 || "Error.InputMaxNumber_65536",
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
            console.log(key);

            isValid = false;
          }
        }

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },

      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != "validate" && key != "body" && key != "submitting")
            obj[key] = form[key].value;
        }
        return obj;
      },
    });

    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        clearErrorsForCode();
        if (!!props?.propData) fnEditCodingChallenge();
        else fnCreateCodingChallenge();

        form.submitting = false;
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    async function fnCreateCodingChallenge() {
      loading.value = true;
      const [success, error] = await createCodingChallenge(props.challengeId, {
        description: form.description.value,
        // coins: !!form.coins.value ? form.coins.value : 0,
        // xp: !!form.xp.value ? form.xp.value : 0,
        time_limit: configs.value.time_limit,
        memory_limit: configs.value.memory_limit,
        static_tests: form.static_tests.value,
        random_tests: form.random_tests.value,
        solution_environment: form.solution_environment.value,
        solution_code: form.solution_code.value,
        evaluator: form.evaluator.value,
      });

      loading.value = false;

      success ? createSuccessHandler(success) : errorHandler(error);
    }

    async function fnEditCodingChallenge() {
      loading.value = true;
      const [success, error] = await updateCodingChallenge(
        props?.challengeId,
        props.propData.id,
        {
          description: form.description.value,
          // coins: !!form.coins.value ? form.coins.value : 0,
          // xp: !!form.xp.value ? form.xp.value : 0,
          time_limit: configs.value.time_limit,
          memory_limit: configs.value.memory_limit,
          static_tests: form.static_tests.value,
          random_tests: form.random_tests.value,
          solution_environment: form.solution_environment.value,
          solution_code: form.solution_code.value,
          evaluator: form.evaluator.value,
        }
      );
      loading.value = false;
      success ? editSuccessHandler(success) : errorHandler(error);
    }

    function createSuccessHandler(res: any) {
      openSnackbar("success", "Success.CreatedCodingChallenge");
      closeDialog();
    }

    function editSuccessHandler(res: any) {
      openSnackbar("success", "Success.EditedCodingChallenge");
    }

    function errorHandler(res: any) {
      console.log("in handler", res.error);
      if (
        res?.error == "Error.EvaluatorFailed" ||
        res?.error == "Error.EvaluatorInvalidOutput"
      ) {
        console.log("evaluator code failed", res.details);
        evaluatorCodeErrorDetails.value = {
          stderr: res.details.run.stderr,
          stdout: res.details.run.stdout,
        };
      } else {
        if (!!res.details?.result?.compile) {
          SolutionCodeErrorDetails.value = {
            stderr: res.details.result.compile.stderr,
            stdout: res.details.result.compile.stdout,
            verdict: res.error,
          };
          console.log("solution code compile error ", res);
        } else if (!!res.details?.result?.run) {
          SolutionCodeErrorDetails.value = {
            stderr: res.details.result.run.stderr,
            stdout: res.details.result.run.stdout,
            verdict: res.error,
          };
          console.log("solution code run error ", res);
        }
      }

      openSnackbar("error", res?.error ?? "");
    }

    function closeDialog() {
      const dialogSlot = useDialogSlot();
      const dialogCreateCodingChallenge = useDialogCreateCodingChallenge();
      dialogSlot.value = false;
      dialogCreateCodingChallenge.value = false;
    }

    async function getEvaulatorAndSolution() {
      const [evaluatorSuccess, evaluatorError] = await getEvaluator(
        props.challengeId,
        props.propData.id
      );
      const [solutionSuccess, solutionError] = await getSolution(
        props.challengeId,
        props.propData.id
      );
      if (!!solutionSuccess) {
        form.solution_code.value = solutionSuccess?.code ?? "";
        form.solution_environment.value = solutionSuccess?.environment ?? "";
      } else {
        openSnackbar("error", "Errors.CannotGetSolution");
      }

      if (!!evaluatorSuccess) {
        form.evaluator.value = evaluatorSuccess;
      } else {
        openSnackbar("error", "Errors.CannotGetEvaluator");
      }
    }

    async function setFormData() {
      if (props.propData != null) {
        await getEvaulatorAndSolution();
        form.description.value = props?.propData?.description ?? "";
        // form.xp.value = props?.propData?.xp ?? "";
        // form.coins.value = props?.propData?.coins ?? "";
        form.static_tests.value = props?.propData?.static_tests ?? "";
        form.random_tests.value = props?.propData?.random_tests ?? "";

        form.description.valid =
          props?.propData.description.trim() != "" ? true : false;
        // form.xp.valid = props?.propData.xp >= 0 ? true : false;
        // form.coins.valid = props?.propData.coins >= 0 ? true : false;
        form.random_tests.valid =
          props?.propData.random_tests >= 1 ? true : false;
        form.static_tests.valid =
          props?.propData.static_tests >= 1 ? true : false;
      }
    }

    function enterExampleCode() {
      form.solution_code.value =
        environments.value[form.solution_environment.value].example;
    }

    function clearErrorsForCode() {
      evaluatorCodeErrorDetails.value = {
        stdout: "",
        stderr: "",
      };
      SolutionCodeErrorDetails.value = {
        stdout: "",
        stderr: "",
        verdict: "",
      };
    }

    watch(
      () => evaluatorTemplate.value,
      (newValue, oldValue) => {
        form.evaluator.value = newValue;
      },
      { immediate: true }
    );

    watch(
      () => props.propData,
      () => {
        setFormData();
      },
      { deep: true }
    );

    onMounted(async () => {
      await getEnvironments();
      await getEvaluatorTemplate();
      await getConfigs();
      if (props.propData != null) {
        setFormData();
      }
      loadingData.value = false;
    });

    return {
      user,
      form,
      t,
      refForm,
      onclickSubmitForm,
      closeDialog,
      loading,
      languages,
      isFirstTime,
      InformationCircleIcon,
      loadingData,
      CodeBracketIcon,
      advanceSettings,
      enterExampleCode,
      evaluatorCodeErrorDetails,
      SolutionCodeErrorDetails,
    };
  },
};
</script>

<style scoped>
.popIn-enter-from {
  opacity: 0;
  height: 0px;
}
.popIn-enter-active {
  transition: all 500ms;
}

.popIn-leave-to {
  opacity: 0;
}
.popIn-leave-active {
  transition: all 200ms;
}
</style>
