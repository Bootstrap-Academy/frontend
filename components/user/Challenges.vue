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

    <ChallengesProgressSummary :data="myChallengesStats?.challenges ?? null" />

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
      <!-- <NuxtLink to="/challenges/leader-board">
        <Btn tertiary>
          {{ t("Buttons.LeaderBoard") }}
        </Btn>
      </NuxtLink> -->
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

    const loading = ref(!!!myChallengesStats.value);

    onMounted(async () => {
      await getMyChallengesStats();
      loading.value = false;
    });

    const progress = computed(() => {
      return [
        {
          heading: t("Headings.Score", {
            score: myChallengesStats.value?.score?.current ?? 0,
          }),
          current: myChallengesStats.value?.score?.current ?? 0,
          total: myChallengesStats.value?.score?.total ?? 10,
        },
        {
          heading: t("Headings.ChallengesSolved"),
          current: myChallengesStats.value?.challenges?.solved ?? 0,
          total: myChallengesStats.value?.challenges?.total ?? 10,
        },
        {
          heading: t("Headings.CategoriesCompleted"),
          current: myChallengesStats.value?.categories?.completed ?? 0,
          total: myChallengesStats.value?.categories?.total ?? 10,
        },
      ];
    });

    return { t, loading, myChallengesStats, progress };
  },
});
</script>

<style scoped></style>
