<template>
  <main
    class="h-screen-main min mt-main mb-main container-fluid relative grid grid-cols-1 gap-container md:grid-cols-[1fr_275px] xl:grid-cols-[1fr_350px]"
  >
    <header
      class="grid h-fit grid-cols-1 gap-5 md:col-span-2 md:grid-cols-[200px_1fr] md:gap-x-10 lg:grid-cols-[300px_1fr_auto]"
    >
      <SkeletonMedia
        class="h-[200px] w-full rounded-md shadow-xl sm:h-[250px] md:row-span-2 lg:row-span-1"
      />

      <div>
        <SkeletonText sm />
        <SkeletonText lg class="w-3/5 mt-card-sm" />
        <SkeletonText lg class="w-2/5 mt-box mb-card" />
        <SkeletonText sm body />
      </div>

      <SkeletonText sm body class="h-fit w-[75px] min-w-[75px] max-w-[75px] mt-card" />
    </header>

    <section class="card bg-secondary style-card">
      <article>
        <h2 class="text-heading-3 mb-box">{{ t("Headings.Description") }}</h2>
        <SkeletonText body />
        <SkeletonText body class="mt-box mb-box" />
        <SkeletonText body />
      </article>

      <article class="mt-card mb-card">
        <h2 class="text-heading-3 mb-box">{{ t("Headings.LearningGoals") }}</h2>
        <SkeletonList id="skeletonLearningGoals" checklist />
      </article>

      <article>
        <h2 class="text-heading-3 mb-box">{{ t("Headings.Requirements") }}</h2>
        <SkeletonList id="skeletonRequirements" />
      </article>
    </section>

    <section
      class="card col-start-1 row-start-2 bg-secondary style-card md:sticky md:col-start-[initial] md:row-span-2 md:row-start-[initial] md:self-start md:top-container"
    >
      <article class="mx-auto w-fit">
        <p class="text-body-1 uppercase text-subheading">
          {{ t("Headings.Price") }}
        </p>

        <div class="mt-2 flex items-end gap-box">
          <div class="w-[50px] animate-pulse rounded-3xl bg-[#42546e] p-2 transition-basic"></div>
          <p class="text-body-1 m-0">
            {{ t("Headings.Morphcoins") }}
          </p>
        </div>
      </article>

      <hr class="mb-8 mt-4" />

      <div class="grid gap-box">
        <IconText v-for="({ icon }, i) of stats" :key="i" :icon="icon" lg highlight-label>
          <SkeletonText body class="mt-2 min-w-[75px]" />
        </IconText>
      </div>

      <hr class="my-8" />

      <Btn full>
        <span class="text-accent">{{ t("Buttons.EnrollNow") }}</span>
      </Btn>
    </section>

    <section>
      <h2 class="text-heading-3 mb-box">
        {{ t("Headings.CourseCurriculum") }}
      </h2>

      <section class="card grid bg-secondary style-card gap-card">
        <div v-for="n in 3" :key="n">
          <hr v-if="n > 0" class="mb-card" />

          <header class="flex cursor-pointer items-center justify-between">
            <div>
              <p class="mb-1 text-xs uppercase tracking-[2px]">
                {{ t("Headings.Section") }} {{ n }}
              </p>
              <SkeletonText class="mt-5 flex-shrink-0" />
            </div>
            <ChevronDownIcon class="h-5 w-5 text-accent" />
          </header>

          <div v-if="n == 1" class="grid gap-card-sm pt-card-sm">
            <article
              class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-box"
              v-for="j in 3"
              :key="j"
            >
              <PlayIconSolid class="h-5 w-5 flex-shrink-0 fill-accent md:h-6 md:w-6" />

              <SkeletonText class="flex-shrink-0" />

              <SkeletonText body class="min-w-fit flex-shrink-0" />
            </article>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import {
  ClockIcon,
  PlayIcon,
  KeyIcon,
  LanguageIcon,
  ChevronDownIcon,
} from "@heroicons/vue/24/outline";

import { PlayIcon as PlayIconSolid } from "@heroicons/vue/24/solid";

export default {
  components: {
    ClockIcon,
    PlayIcon,
    KeyIcon,
    LanguageIcon,
    ChevronDownIcon,
    PlayIconSolid,
  },
  setup() {
    const { t } = useI18n();

    const stats = computed(() => {
      return [
        {
          icon: ClockIcon,
        },
        {
          icon: PlayIcon,
        },
        {
          icon: KeyIcon,
        },
        {
          icon: LanguageIcon,
        },
      ];
    });

    return { t, stats };
  },
};
</script>

<style scoped></style>
