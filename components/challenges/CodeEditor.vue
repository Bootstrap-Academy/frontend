<template>
  {{ languagee }}
  <div class="grid gap-card grid-rows-[auto_minmax(0,1fr)] h-full w-full">
    <header class="flex flex-wrap gap-card justify-between" v-if="showButtons">
      <InputSelect
        id="code-language"
        :options="languages"
        sm
        btn-type
        v-model="language"
        @update:model-value="update($event)"
      />
      <article class="flex flex-wrap gap-card-sm">
        <InputBtn :loading="testExampleLoading">Text Examples</InputBtn>
        <InputBtn @click="fnCreateSubmission()" :loading="submitButtonLoading"
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
  },

  emits: ["update:modelValue", "valid", "environment"],

  setup(props, { emit }) {
    let editor: monaco.editor.IStandaloneCodeEditor;
    const editorContainer = ref<HTMLDivElement | null>(null);
    const environments: any = useEnvironments();

    const code: any = ref("");
    const submitButtonLoading = ref(false);
    const testExampleLoading = ref(false);
    const submission = useCodingSubmission();

    const languages: any = computed(() => {
      const items = [];
      for (const key in environments.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });
    const language = ref("typescript");
    watch(
      () => language.value,
      () => {
        emit("environment", language.value);
      },
      { immediate: true }
    );

    watch(
      () => props.modelValue,
      (newValue) => {
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue);
        }
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
      submitButtonLoading.value = false;
      if (success) openSnackbar("success", "Success.CreatedSubmission");
      else openSnackbar("error", error);
    }

    onMounted(async () => {
      await getEnvironments();
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
    });

    function update(value: string) {
      if (editor) {
        const model = editor.getModel();

        if (model) {
          monaco.editor.setModelLanguage(model, language.value);
        }
      }
    }

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
    };
  },
});
</script>
