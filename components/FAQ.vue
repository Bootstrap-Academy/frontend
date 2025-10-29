<template>
  <section
    @click="onclickToggleBoxBody"
    class="cursor-pointer overflow-hidden border-b-2 border-tertiary py-3 md:py-6"
  >
    <h3 class="text-heading-4 flex justify-between">
      {{ t(heading) }}
      <ChevronDownIcon
        class="h-5 w-5 flex-shrink-0 origin-center transition duration-500 ease-out"
        :class="{ 'rotate-180 text-accent': expand }"
      />
    </h3>

    <article
      ref="article"
      :style="{ maxHeight: max_height }"
      class="overflow-hidden transition-all duration-500 ease-out"
    >
      <p class="text-body-1 mt-2 text-body font-body">
        {{ t(body) }}
        <NuxtLink
          v-if="link && link.to && link.text"
          :to="link.to"
          class="inline-block border-b-2 border-accent lowercase hover:text-white"
        >
          {{ t(link.text) }}
        </NuxtLink>
      </p>
    </article>
  </section>
</template>

<script>
import { defineComponent, ref } from "vue";
import { ChevronDownIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { ChevronDownIcon },
  props: {
    expand: { type: Boolean, default: false },
    heading: { type: String, default: "" },
    body: { type: String, default: "" },
    link: { default: null },
  },
  emits: ["expand"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const article = ref(null);

    const max_height = computed(() => {
      return props.expand ? `${article?.value?.scrollHeight ?? 0}px` : `0px`;
    });

    function onclickToggleBoxBody() {
      emit("expand", !props.expand);
    }
    return { onclickToggleBoxBody, article, max_height, t };
  },
});
</script>

<style lang="scss" scoped></style>
