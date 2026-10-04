<template>
  <section>
    <article class="flex justify-end">
      <InputSelect
        v-model="selectedLanguage"
        :options="languages"
        aria-label="LearningRooms.Language"
        v-if="languages.length"
      />
    </article>
    <LeaderboardStatus v-if="page.error" :error="page.error" @reload="reload" />
    <SkeletonLeaderboard v-else-if="loading" />
    <LeaderboardListing v-else-if="leaderBoardList.length" :leaderBoardList="leaderBoardList" />
    <section v-else-if="!leaderBoardList.length">
      <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
    </section>
  </section>
</template>

<script lang="ts">
import { useLanguageLeaderboardList } from "~~/composables/leaderboard";
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    const selectedLanguage: any = ref("python");
    const leaderBoardList = useLanguageLeaderboardList();
    const loading = ref(true);
    const environments: any = useEnvironments();
    const offset = useLeaderboardOffset();
    const page = useLeaderboardPage();
    const invalidation = useLeaderboardInvalidation();
    async function reload() {
      loading.value = true;
      await getLanguageLeaderboard(selectedLanguage.value, 0);
      loading.value = false;
    }
    watch(invalidation, reload);
    const languages: any = computed(() => {
      const items = [];
      for (const key in environments?.value) {
        items.push({ label: key, value: key });
      }
      return items;
    });

    watch(
      () => selectedLanguage.value,
      async (newValue) => {
        const router = useRouter();
        leaderBoardList.value = [];
        const route = useRoute();

        router.replace({
          path: route.path,
          query: {
            selectedButton: 0,
            selectedLanguage: newValue,
          },
        });

        await reload();
      },
      { immediate: true }
    );

    onMounted(async () => {
      offset.value = 0;
      await getEnvironments();
    });

    return {
      t,
      selectedLanguage,
      languages,
      leaderBoardList,
      loading,
      page,
      reload,
    };
  },
};
</script>

<style scoped></style>
