<template>
  <section class="bg-secondary card style-card grid gap-card-sm">
    <div class="flex max-md:flex-wrap gap-box items-start justify-between mb-2">
      <SectionTitle sub heading="Headings.MyChallengesStats" body="Body.MyChallengesStats" class="!m-0" />
      <NuxtLink to="/challenges/leader-board" class="max-sm:hidden">
        <Btn class="w-full justify-center" :icon="TrophyIcon">
          {{ t("Buttons.GoToLeaderBoard") }}
        </Btn>
      </NuxtLink>
    </div>

    <ChallengesProgress v-if="progress.total != null" :heading="t('Headings.Progress')" :subdivisions="[
      { value: progress.attempted, color: 'bg-warning' },
      { value: progress.solved, color: 'bg-accent' },
    ]" :total="progress.total" />
    <p v-else class="px-2 max-w-max rounded-md text-error border border-error">
      {{ t("Headings.NoChallengesStats") }}
    </p>

    <ChallengesProgressSummary :data="codingChallengesStats ?? null" />

    <NuxtLink to="/challenges/leader-board" class="sm:hidden mt-4">
      <Btn class="w-full justify-center">
        {{ t("Buttons.GoToLeaderBoard") }}
      </Btn>
    </NuxtLink>
  </section>
</template>

<script lang="ts">
import { TrophyIcon } from "@heroicons/vue/24/outline";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { TrophyIcon },
  setup() {
    const { t } = useI18n();
    
    const codingChallengesStats: any = useCodingChallengesStats();

    onMounted(async () => {
      await getCodingChallengesStats();
    });

    const progress = computed(() => {
      return {
        attempted: codingChallengesStats.value?.attempted ?? 0,
        solved: codingChallengesStats.value?.solved ?? 0,
        total: codingChallengesStats.value?.total,
      };
    });

    return { t, codingChallengesStats, progress, TrophyIcon };
  },
});
</script>
