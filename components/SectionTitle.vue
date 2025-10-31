<template>
  <header class="mb-4 grid grid-cols-[1fr_auto] gap-2" v-if="sub">
    <h2 class="text-heading-2 md:self-center">{{ t(heading) }}</h2>
    <NuxtLink v-if="link && link.to && link.text" :to="link?.to ?? ''">
      <Btn secondary sm>{{ t(link.text) }}</Btn>
    </NuxtLink>
    <p class="text-body-2 col-span-2 hidden md:block">{{ t(body) }}</p>
  </header>

  <div v-else class="flex justify-center">
    <header :class="{ 'text-center': center, 'max-w-xl': !full }">
      <h1 v-if="size == 'xl'" class="text-display-2 mb-4 leading-tight md:mb-6">
        <strong class="text-subheading-1 mb-2 block md:mb-4">
          {{ t(subheading) }}
        </strong>
        {{ t(heading) }}
      </h1>

      <h1 v-else-if="size == 'lg'" class="text-heading-1 mb-5">
        <strong class="text-subheading-1 mb-2 block">{{ t(subheading) }}</strong>
        {{ t(heading) }}
      </h1>

      <h3 v-else-if="size == 'sm'" class="text-heading-2 mb-2">
        <strong class="mb-2 block text-xs text-accent md:text-sm">
          {{ t(subheading) }}
        </strong>
        {{ t(heading) }}
      </h3>
      <h2 v-else class="text-heading-1 leading-normal mb-box">
        <strong class="text-subheading-1 mb-1 block xl:mb-2">
          {{ t(subheading) }}
        </strong>
        {{ t(heading) }}
      </h2>
      <p>{{ t(body) }}</p>
    </header>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    size: { type: String, default: "md" },
    center: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    heading: { type: String, default: `` },
    subheading: { type: String, default: `` },
    body: { type: String, default: `` },
    sub: { type: Boolean, default: false },
    noLink: { type: Boolean, default: false },
    link: { default: { to: "", text: "" } },
  },
  setup(props) {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
