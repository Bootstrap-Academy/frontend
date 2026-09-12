<template>
  <div class="learning-code">
    <label :for="id" class="code-label">{{ t("LearningRooms.Code") }}</label>
    <textarea
      v-if="!enhanced"
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      rows="12"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div v-show="enhanced" ref="container" class="monaco-container" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type * as Monaco from "monaco-editor";

const props = defineProps<{ modelValue: string; language: string; disabled?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const { t } = useI18n();
const id = useId();
const container = ref<HTMLDivElement | null>(null);
const enhanced = ref(false);
let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
let monaco: typeof Monaco | undefined;
let alive = true;
const language = () => props.language.split("-")[0];
onMounted(async () => {
  // Native editing remains usable with mobile keyboards and if Monaco cannot load.
  if (window.matchMedia("(pointer: coarse)").matches) return;
  try {
    monaco = await import("monaco-editor");
    if (!alive || !container.value) return;
    enhanced.value = true;
    await nextTick();
    if (!alive) return;
    editor = monaco.editor.create(container.value, {
      value: props.modelValue,
      language: language(),
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      fontSize: 16,
      tabSize: 4,
      readOnly: props.disabled,
      ariaLabel: t("LearningRooms.Code"),
      tabFocusMode: true,
    });
    editor.onDidChangeModelContent(() => emit("update:modelValue", editor!.getValue()));
  } catch {
    enhanced.value = false;
  }
});
watch(
  () => props.modelValue,
  (value) => {
    if (editor && editor.getValue() !== value) editor.setValue(value);
  }
);
watch(
  () => props.language,
  () => {
    const model = editor?.getModel();
    if (model && monaco) monaco.editor.setModelLanguage(model, language());
  }
);
watch(
  () => props.disabled,
  (value) => editor?.updateOptions({ readOnly: value })
);
onBeforeUnmount(() => {
  alive = false;
  editor?.getModel()?.dispose();
  editor?.dispose();
});
</script>

<style scoped>
.learning-code {
  min-width: 0;
}
.code-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
.monaco-container {
  height: 360px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #426074;
  border-radius: 10px;
}
textarea {
  display: block;
  width: 100%;
  min-height: 300px;
  resize: vertical;
  padding: 16px;
  border: 1px solid #426074;
  border-radius: 10px;
  background: #0b1929;
  color: #eaf2f8;
  font:
    16px/1.6 ui-monospace,
    monospace;
  tab-size: 4;
}
textarea:focus-visible {
  outline: 2px solid #71e3cf;
  outline-offset: 3px;
}
</style>
