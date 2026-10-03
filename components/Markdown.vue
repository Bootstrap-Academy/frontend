<template>
  <component :is="as" v-if="html !== null" v-html="html" />
  <component :is="as" v-else class="whitespace-pre-wrap">{{ source }}</component>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(defineProps<{ source?: string; as?: "div" | "span" }>(), {
  source: "",
  as: "div",
});
const html = ref<string | null>(null);

watch(
  () => props.source,
  (source, _, onCleanup) => {
    let current = true;
    onCleanup(() => (current = false));
    html.value = source ? null : "";
    if (!source) return;
    // The consumer owns loading. Nuxt's global plugin startup stays synchronous.
    import("~/utils/markdown/renderer")
      .then(({ renderMarkdown }) => renderMarkdown(source))
      .then((result) => {
        if (current) html.value = result;
      })
      .catch(() => {
        // Keep readable, escaped text when a chunk cannot be loaded.
      });
  },
  { immediate: true }
);
</script>
