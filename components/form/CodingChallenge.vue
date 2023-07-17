<template>
  <div>
    <form
      class="flex flex-col gap-box"
      :class="{ 'form-submitting': form.submitting }"
      @submit.prevent="onclickSubmitForm()"
      ref="refForm"
    >
      <article class="grid sm:grid-cols-2 md:grid-cols-3 sm:gap-x-10">
        <Input
          :label="t('Inputs.StaticTests')"
          :type="'number'"
          :rules="form.static_tests.rules"
          v-model="form.static_tests.value"
          @valid="form.static_tests.valid = $event"
        />
        <Input
          :label="t('Inputs.RandomTests')"
          :type="'number'"
          :rules="form.random_tests.rules"
          v-model="form.random_tests.value"
          @valid="form.random_tests.valid = $event"
        />
        <InputSelect
          v-if="languages.length"
          :rules="form.solution_environment.rules"
          :label="t('Inputs.SolutionEnvironment')"
          :options="languages"
          btn-type
          v-model="form.solution_environment.value"
        />
      </article>

      <article class="grid sm:grid-cols-2 md:grid-cols-3 sm:gap-x-10">
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
        <Input
          :label="t('Inputs.Fee')"
          :type="'number'"
          :rules="form.fee.rules"
          v-model="form.fee.value"
          @valid="form.fee.valid = $event"
        />
      </article>

      <InputTextarea
        :label="t('Inputs.Description')"
        v-model="form.description.value"
        @valid="form.description.valid = $event"
        :rules="form.description.rules"
      />

      <article>
        <p class="mb-2 ml-1">{{ t("Headings.EvaluatorCode") }}</p>
        <ChallengesCodeEditor class="h-full" v-model="form.evaluator.value" />
      </article>

      <article>
        <p class="mb-2 ml-1">{{ t("Headings.SolutionCode") }}</p>
        <ChallengesCodeEditor
          class="h-full"
          v-model="form.solution_code.value"
        />
      </article>

      <section class="flex gap-3 flex-wrap justify-end">
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
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { PropType, ref } from "vue";
import {
  updateCodingChallenge,
  createCodingChallenge,
  getEvaluator,
  getSolution,
  getConfigs,
  useConfigs,
  getEnvironments,
  useEnvironments,
} from "~~/composables/codingChallenges";
import { IForm } from "~/types/form";

export default {
  props: {
    propData: { type: Object as PropType<any>, default: null },
    challengeId: { type: String, default: "" },
  },

  setup(props) {
    const { t } = useI18n();
    const refForm = ref<HTMLFormElement | null>(null);
    const loading = ref(false);
    const configs: any = useConfigs();
    const environments: any = useEnvironments();
    const user: any = useUser();

    const languages: any = computed(() => {
      const items = [];
      for (const key in environments?.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });

    const maxFee: any = computed(() => {
      if (!!!user?.value?.admin) {
        return 1;
      } else return 1000000000;
    });

    const form = reactive<IForm>({
      description: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Description",
          (v: string) => v.length >= 10 || "Error.InputMinLength_10",
          (v: string) => v.length <= 4096 || "Error.InputMaxLength_4096",
        ],
      },
      xp: {
        valid: true,
        value: null,
        rules: [(v: number) => v >= 0 || "Error.InputMinNumber_0"],
      },
      coins: {
        valid: true,
        value: null,
        rules: [(v: number) => v >= 0 || "Error.InputMinNumber_0"],
      },
      fee: {
        valid: true,
        value: null,
        rules: [
          (v: number) =>
            v <= maxFee.value || `Error.InputMaxNumber_${maxFee.value}`,
        ],
      },
      static_tests: {
        valid: false,
        value: null,
        rules: [
          (v: number) => !!v || "Error.InputEmpty_Inputs.StaticTests",
          (v: number) => v <= 20 || "Error.InputMaxNumber_20",
        ],
      },
      random_tests: {
        valid: false,
        value: null,
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
        coins: !!form.coins.value ? form.coins.value : 0,
        xp: !!form.xp.value ? form.xp.value : 0,
        fee: !!form.fee.value ? form.fee.value : 0,
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
          coins: !!form.coins.value ? form.coins.value : 0,
          xp: !!form.xp.value ? form.xp.value : 0,
          fee: !!form.fee.value ? form.fee.value : 0,
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
      openSnackbar("error", res ?? "");
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
      // console.log("form.evaluator", evaluatorSuccess);
      // console.log("form.solution", solutionSuccess.code);
      // console.log("form.environemnt", solutionSuccess.environment);
    }

    async function setFormData() {
      // console.log("watching propdata", props.propData);
      if (props.propData != null) {
        await getEvaulatorAndSolution();
        form.description.value = props?.propData?.description ?? "";
        form.xp.value = props?.propData?.xp ?? "";
        form.coins.value = props?.propData?.coins ?? "";
        form.fee.value = props?.propData?.fee ?? "";
        form.static_tests.value = props?.propData?.static_tests ?? "";
        form.random_tests.value = props?.propData?.random_tests ?? "";

        form.description.valid =
          props?.propData.description.trim() != "" ? true : false;
        form.xp.valid = props?.propData.xp >= 0 ? true : false;
        form.coins.valid = props?.propData.coins >= 0 ? true : false;
        form.fee.valid = props?.propData.fee >= 0 ? true : false;
        form.random_tests.valid =
          props?.propData.random_tests >= 1 ? true : false;
        form.static_tests.valid =
          props?.propData.static_tests >= 1 ? true : false;
      }
    }

    watch(
      () => props.propData,
      () => {
        setFormData();
      },
      { deep: true }
    );

    onMounted(async () => {
      setLoading(true);
      await getEnvironments();
      await getConfigs();
      if (props.propData != null) {
        setFormData();
      }
      setLoading(false);
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
    };
  },
};
</script>

<style lang="scss" scoped></style>
