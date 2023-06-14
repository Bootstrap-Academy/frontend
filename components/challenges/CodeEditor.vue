<template>
  <div class="grid gap-card grid-rows-[auto_minmax(0,1fr)] h-full w-full">
    <header class="flex gap-card justify-between" v-if="showButtons">
      <InputSelect
        id="code-language"
        :options="languages"
        sm
        btn-type
        v-model="language"
        @update:model-value="update($event)"
      />

      <article class="flex gap-card-sm">
        <Btn>Text Examples</Btn>
        <Btn>Submit</Btn>
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

export default defineComponent({
  props: {
    modelValue: { default: "" },
    showButtons: { default: false },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    let editor: monaco.editor.IStandaloneCodeEditor;

    const editorContainer = ref<HTMLDivElement | null>(null);

    watch(
      () => props.modelValue,
      (newValue) => {
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue);
        }
      }
    );

    const handleEditorDidMount = (
      editorInstance: monaco.editor.IStandaloneCodeEditor
    ) => {
      editor = editorInstance;

      editor.getModel()?.onDidChangeContent(() => {
        const value = editor.getValue();
        if (props.modelValue !== value) {
          emit("update:modelValue", value);
        }
      });
    };

    const language = ref("typescript");
    const languages = ref([
      {
        label: "CSS",
        value: "css",
      },
      {
        label: "HTML",
        value: "html",
      },
      {
        label: "TypeScript",
        value: "typescript",
      },
    ]);

    onMounted(() => {
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
    };
  },
});
</script>
