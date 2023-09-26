<template>
  <section class="bg-secondary card style-card grid gap-card-sm">
    <div class="flex flex-wrap gap-box items-start justify-between mb-2">
      <SectionTitle
        sub
        heading="Headings.MyChallengesStats"
        body="Body.MyChallengesStats"
        class="!m-0"
      />
      <ChallengesMyRank :rank="myChallengesStats?.rank ?? 0" />
    </div>

    <ChallengesProgressSummary :data="codingChallengesStats ?? null" />

    <ChallengesProgress
      v-for="(item, i) of progress"
      :key="i"
      :data="item"
      :loading="loading"
    />

    <article class="flex flex-wrap gap-card-sm mt-4">
      <!-- <NuxtLink to="/profile/challenges">
				<Btn secondary>
					{{ t('Buttons.MyChallenges') }}
				</Btn>
			</NuxtLink> -->
      <NuxtLink to="/challenges/leader-board">
        <Btn>
          {{ t("Buttons.LeaderBoard") }}
        </Btn>
      </NuxtLink>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    const myChallengesStats = useMyChallengesStats();

    const codingChallengesStats: any = useCodingChallengesStats();
    const loading = ref(!!!codingChallengesStats.value);
    onMounted(async () => {
      await getCodingChallengesStats();
      loading.value = false;
    });
    // const propgress = computed(() => {});
    const progress = computed(() => {
      return [
        {
          heading: t("Headings.Attempted"),
          current: codingChallengesStats.value?.attempted ?? 0,
          total: codingChallengesStats.value?.total ?? 10,
        },
        {
          heading: t("Headings.ChallengesSolved"),
          current: codingChallengesStats.value?.solved ?? 0,
          total: codingChallengesStats.value?.total ?? 10,
        },
      ];
    });

    return { t, loading, myChallengesStats, codingChallengesStats, progress };
  },
});
</script>

<style scoped></style>
