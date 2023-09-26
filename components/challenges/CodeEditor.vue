<template>
  {{ languagee }}
  <div class="grid gap-card grid-rows-[auto_minmax(0,1fr)] h-full w-full">
    <header class="flex flex-wrap gap-card justify-between" v-if="showButtons">
      <div class="flex gap-3">
        <InputSelect
          class="z-0"
          id="code-language"
          :options="languages"
          sm
          btn-type
          v-model="language"
          @update:model-value="update($event)"
        />
        <p class="mt-2"><span class="text-accent">XP:</span> {{ xp }}</p>
      </div>

      <article class="flex flex-wrap gap-card-sm">
        <InputBtn
          v-if="!isPremium"
          :icon="HeartIcon"
          iconRight
          :iconColor="'#FF0000'"
          @click="openDialogSubmission()"
          :loading="submitButtonLoading"
          >Submit</InputBtn
        >

        <InputBtn
          v-else-if="isPremium"
          iconRight
          @click="fnCreateSubmission()"
          :loading="submitButtonLoading"
          >Submit</InputBtn
        >
      </article>
    </header>
    <div
      ref="editorContainer"
      class="w-full h-full min-h-[300px] style-card overflow-hidden"
    ></div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  Prop,
  onMounted,
  onBeforeUnmount,
  watch,
  Ref,
} from "vue";
import * as monaco from "monaco-editor";
import { HeartIcon } from "@heroicons/vue/24/outline";
import {
  createSubmission,
  getEnvironments,
  useEnvironments,
  useCodingSubmission,
} from "~~/composables/codingChallenges";
export default defineComponent({
  props: {
    modelValue: { default: "" },
    showButtons: { default: false },
    codingChallengeId: { type: String, default: "" },
    challengeId: { type: String, default: "" },
    xp: { type: String, default: "" },
  },

  emits: ["update:modelValue", "valid", "environment"],
  components: { HeartIcon },
  setup(props, { emit }) {
    let editor: monaco.editor.IStandaloneCodeEditor;
    const editorContainer = ref<HTMLDivElement | null>(null);
    const environments: any = useEnvironments();

    const code: any = ref("");
    const submitButtonLoading = ref(false);
    const testExampleLoading = ref(false);
    const submission = useCodingSubmission();
    const premiumInfo: any = usePremiumInfo();
    const language = ref("typescript");
    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });
    const interval: any = ref(null);

    const languages: any = computed(() => {
      const items = [];
      for (const key in environments.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });

    const handleEditorDidMount = (
      editorInstance: monaco.editor.IStandaloneCodeEditor
    ) => {
      editor = editorInstance;

      editor.getModel()?.onDidChangeContent(() => {
        const value = editor.getValue();
        if (props.modelValue !== value) {
          code.value = value;
          emit("update:modelValue", value);
        }
      });
    };

    async function openDialogSubmission() {
      return openDialog(
        "info",
        "Buttons.CreateSubmission",
        "Body.BuyCodingChallnge",
        false,
        {
          label: "Buttons.Submit",
          onclick: () => {
            fnCreateSubmission();
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    async function fnCreateSubmission() {
      submitButtonLoading.value = true;
      const [success, error] = await createSubmission(
        props.challengeId,
        props.codingChallengeId,
        {
          environment: language.value,
          code: code.value,
        }
      );
      await getHearts();
      await getBalance();
      submitButtonLoading.value = false;

      clearInterval(interval.value);

      interval.value = setInterval(async () => {
        console.log("interval");
        await getSubmissions(props.challengeId, props.codingChallengeId);
      }, 5000);

      if (success) openSnackbar("success", "Success.CreatedSubmission");
      else openSnackbar("error", error);
    }

    watch(
      () => props.modelValue,
      (newValue) => {
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue);
        }
      }
    );

    watch(
      () => language.value,
      (newValue, oldValue) => {
        openDialog(
          "info",
          "Headings.UpdateYourCode",
          "Body.UpdateYourCode",
          false,
          {
            label: "Buttons.Update",
            onclick: () => {
              emit(
                "update:modelValue",
                environments.value[language.value].example
              );
            },
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
      }
    );

    watch(
      () => submission.value,
      (newValue: any, oldValue) => {
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue.code);
          language.value = newValue.environment;
        }
      },
      { deep: true }
    );

    watch(
      () => language.value,
      () => {
        emit("environment", language.value);
      },
      { immediate: true }
    );

    function update(value: string) {
      if (editor) {
        const model = editor.getModel();

        if (model) {
          monaco.editor.setModelLanguage(model, language.value);
        }
      }
    }

    onMounted(async () => {
      await getEnvironments();
      await getPremiumStatus();
      const container = <HTMLElement>editorContainer.value;

      editor = monaco.editor.create(container, {
        value: props.modelValue,
        language: language.value,
        theme: "vs-dark",
      });

      handleEditorDidMount(editor);
    });

    onBeforeUnmount(() => {
      editor?.dispose();
      clearInterval(interval.value);
    });

    return {
      handleEditorDidMount,
      editorContainer,
      languages,
      language,
      update,
      code,
      submitButtonLoading,
      testExampleLoading,
      fnCreateSubmission,
      HeartIcon,
      isPremium,
      openDialogSubmission,
    };
  },
});
</script>
