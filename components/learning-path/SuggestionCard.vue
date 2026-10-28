<!-- One suggested course, why it fits, and the way onto the plan. -->
<template>
  <article class="suggestion">
    <div class="text">
      <NuxtLink :to="`/courses/${encodeURIComponent(suggestion.course)}`" class="title">{{
        suggestion.title
      }}</NuxtLink>
      <p v-if="reason" class="reason">{{ t(reason.key, reason.values) }}</p>
    </div>
    <button type="button" class="add" @click="emit('add')">
      <PlusIcon aria-hidden="true" />{{ t("LearningPlan.Add") }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PlusIcon } from "@heroicons/vue/24/outline";
import type { PropType } from "vue";
import type { PlanSuggestion } from "~/types/learningPlan";

defineProps({
  suggestion: { type: Object as PropType<PlanSuggestion>, required: true },
  /** The sentence of `suggestionReason`; without one the card names only the course. */
  reason: {
    type: Object as PropType<{ key: string; values: Record<string, string> } | null>,
    default: null,
  },
});
const emit = defineEmits<{ add: [] }>();
const { t } = useI18n();
</script>

<style scoped>
/* The base styles give lists, paragraphs and links the monospace face of older pages. */
.suggestion,
.suggestion :is(p, a, button) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
/* Text and button side by side where both fit, else the button below the text. */
.suggestion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid #2c4259;
  border-radius: 16px;
  background: #0f1d31;
}
.text {
  display: grid;
  flex: 1 1 220px;
  gap: 2px;
  min-width: 0;
}
.title {
  justify-self: start;
  padding: 4px 0;
  color: #edf3fb;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.title:hover {
  color: #0cc9ab;
}
.reason {
  margin: 0;
  color: #9fb3c8;
  font-size: 0.875rem;
  line-height: 1.45;
}
.add {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #0cc9ab;
  border-radius: 999px;
  color: #87e6d4;
  font-size: 0.875rem;
  font-weight: 650;
}
.add:hover {
  background: #0f2a35;
}
.add svg {
  width: 18px;
  height: 18px;
}
:is(a, button):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
</style>
