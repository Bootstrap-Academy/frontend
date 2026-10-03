<template>
  <div class="grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-card">
    <header class="flex flex-wrap justify-between gap-card" v-if="showButtons">
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

      <article class="flex flex-wrap items-center gap-card-sm">
        <!--
          The caption explains when a whole heart is charged.
        -->
        <p v-if="!heartFree" class="text-xs text-body">
          {{ t("Body.WrongAnswerCostsOneHeart") }}
        </p>

        <InputBtn
          v-if="!heartFree"
          :icon="HeartIcon"
          iconRight
          :iconColor="'#FF0000'"
          @click="openDialogSubmission()"
          :loading="submitButtonLoading"
          >{{ t("Buttons.Submit") }}</InputBtn
        >

        <InputBtn
          v-else-if="heartFree"
          iconRight
          @click="fnCreateSubmission()"
          :loading="submitButtonLoading"
          >{{ t("Buttons.Submit") }}</InputBtn
        >
      </article>
      <LearningDailyLimit v-if="attemptLimit" :value="attemptLimit" class="w-full" />
    </header>
    <div ref="editorContainer" class="h-full min-h-[300px] w-full overflow-hidden style-card">
      <textarea
        v-if="!enhanced"
        :value="modelValue"
        :aria-label="t('LearningRooms.Code')"
        class="h-full min-h-[300px] w-full resize-y bg-secondary p-4 font-mono text-base text-heading"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        @input="nativeInput"
      />
      <div v-show="enhanced" ref="monacoContainer" class="h-full min-h-[300px] w-full" />
    </div>
  </div>
</template>

<script lang="ts">
import { decodeApiError } from "~/utils/apiError";
import { useI18n } from "vue-i18n";
import { defineComponent, onMounted, onBeforeUnmount, watch, ref, computed, nextTick } from "vue";
import type * as Monaco from "monaco-editor";
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
    selectedLanguage: { type: String, default: null },
    showButtons: { default: false },
    codingChallengeId: { type: String, default: "" },
    challengeId: { type: String, default: "" },
    xp: { type: String, default: "" },
  },

  emits: ["update:modelValue", "valid", "environment"],
  components: { HeartIcon },
  setup(props, { emit }) {
    const { t } = useI18n();
    let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
    let monaco: typeof Monaco | undefined;
    let observer: IntersectionObserver | undefined;
    let alive = true;
    let enhancing = false;
    const editorContainer = ref<HTMLDivElement | null>(null);
    const monacoContainer = ref<HTMLDivElement | null>(null);
    const enhanced = ref(false);
    const environments: any = useEnvironments();

    const code = ref(props.modelValue);
    const submitButtonLoading = ref(false);
    const submission = useCodingSubmission();
    const premiumInfo: any = usePremiumInfo();
    const language = ref("typescript");
    const updateCode = ref(true);

    const { isDaily } = useDailyLearning();
    const { attemptLimit, handleLimit } = useDailyAttemptLimit();
    const heartFree = computed(() => {
      return premiumInfo.value?.premium || isDaily.value;
    });
    const interval: any = ref(null);

    const languages: any = computed(() => {
      const items = [];
      for (const key in environments.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });

    const handleEditorDidMount = (editorInstance: Monaco.editor.IStandaloneCodeEditor) => {
      editor = editorInstance;

      editorInstance.getModel()?.onDidChangeContent(() => {
        const value = editorInstance.getValue();
        if (props.modelValue !== value) {
          code.value = value;
          emit("update:modelValue", value);
        }
      });
    };

    function nativeInput(event: Event) {
      const value = (event.target as HTMLTextAreaElement).value;
      code.value = value;
      emit("update:modelValue", value);
    }

    async function enhanceEditor() {
      if (!alive || enhancing) return;
      enhancing = true;
      observer?.disconnect();
      // Native editing supports small screens and touch keyboards without the large chunk.
      if (window.matchMedia("(pointer: coarse), (max-width: 640px)").matches) return;
      try {
        monaco = await import("monaco-editor");
        if (!alive) return;
        enhanced.value = true;
        await nextTick();
        if (!alive || !monacoContainer.value) return;
        editor = monaco.editor.create(monacoContainer.value, {
          value: props.modelValue,
          language: props.selectedLanguage ?? language.value,
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 16,
          ariaLabel: t("LearningRooms.Code"),
          tabFocusMode: true,
        });
        handleEditorDidMount(editor);
      } catch {
        editor?.getModel()?.dispose();
        editor?.dispose();
        editor = undefined;
        enhanced.value = false;
      }
    }

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
      const [success, error] = await createSubmission(props.challengeId, props.codingChallengeId, {
        environment: language.value,
        code: code.value,
      });
      submitButtonLoading.value = false;
      if (!success) {
        if (!handleLimit(error)) openSnackbar("error", decodeApiError(error).messageKey);
        return;
      }
      await getHearts();
      await getBalance();

      clearInterval(interval.value);

      interval.value = setInterval(async () => {
        await getSubmissions(props.challengeId, props.codingChallengeId);
      }, 5000);

      openSnackbar("success", "Success.CreatedSubmission");
    }

    function updateCodeAsExampleChange() {
      openDialog(
        "info",
        "Headings.UpdateYourCode",
        "Body.UpdateYourCode",
        false,
        {
          label: "Buttons.Update",
          onclick: () => {
            emit("update:modelValue", environments.value[language.value].example);
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    watch(
      () => props.modelValue,
      (newValue) => {
        code.value = newValue;
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue);
        }
      }
    );

    watch(
      () => language.value,
      (newValue, oldValue) => {
        if (!!updateCode.value) {
          updateCodeAsExampleChange();
        }
      }
    );

    watch(
      () => submission.value,
      (newValue: any, oldValue) => {
        if (typeof newValue?.code === "string" && props.modelValue !== newValue.code) {
          code.value = newValue.code;
          if (editor) editor.setValue(newValue.code);
          // using updateCode as boolean so i can neglect watch from showing up dialog
          updateCode.value = false;
          language.value = newValue.environment;
          emit("update:modelValue", newValue.code);
          //setting time zero out so that variable change at the end and dialog don't show up from watch of language
          setTimeout(() => {
            updateCode.value = true;
          }, 0);
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

    watch(
      () => props.selectedLanguage,
      () => {
        update(props.selectedLanguage);
      }
    );

    function update(value: string) {
      if (editor && monaco) {
        const model = editor.getModel();

        if (model) {
          monaco.editor.setModelLanguage(model, props.selectedLanguage ?? language.value);
        }
      }
    }

    onMounted(async () => {
      await getEnvironments();
      await getPremiumStatus();
      if (!alive || !editorContainer.value || typeof IntersectionObserver === "undefined") return;
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0))
          void enhanceEditor();
      });
      observer.observe(editorContainer.value);
    });

    onBeforeUnmount(() => {
      alive = false;
      observer?.disconnect();
      editor?.getModel()?.dispose();
      editor?.dispose();

      clearInterval(interval.value);
    });

    return {
      t,
      handleEditorDidMount,
      editorContainer,
      monacoContainer,
      enhanced,
      nativeInput,
      languages,
      language,
      update,
      code,
      submitButtonLoading,
      fnCreateSubmission,
      HeartIcon,
      heartFree,
      attemptLimit,
      openDialogSubmission,
    };
  },
});
</script>
