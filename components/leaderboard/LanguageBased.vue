<template>
  <section>
    <article class="flex justify-end">
      <InputSelect
        v-model="selectedLanguage"
        :options="languages"
        v-if="languages.length"
      />
    </article>
    <SkeletonLeaderboard v-if="loading" />
    <LeaderboardListing
      v-else-if="leaderBoardList.length"
      :leaderBoardList="leaderBoardList"
    />
    <section v-else-if="!leaderBoardList.length">
      <p>{{ t("Headings.EmptyLeaderBoardList") }}</p>
    </section>
  </section>
</template>

<script lang="ts">
import { TrophyIcon } from "@heroicons/vue/24/outline";
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

        offset.value = 0;
        loading.value = true;
        await getLanguageLeaderboard(newValue, offset.value);
        loading.value = false;
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
    };
  },
};
</script>

<style scoped></style>
