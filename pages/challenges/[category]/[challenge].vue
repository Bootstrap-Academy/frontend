<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->
<template>
  <div>
    <section v-if="hearts == 0" class="flex justify-end px-8 pt-3">
      <UserRefillHeartBtn />
      <UserCoins />
    </section>
    <main
      class="grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_minmax(0,70vh)] md:grid-rows-[auto_minmax(0,1fr)] gap-card card md:h-screen-inner"
    >
      <Head>
        <Title>Solve Challenge - {{ challenge?.title ?? "" }}</Title>
      </Head>

      <header class="w-fit flex items-items gap-card">
        <div>
          <template v-for="(path, i) of breadcrumbs" :key="i">
            <NuxtLink
              v-if="path.to"
              :to="path.to"
              class="inline-block text-body-2"
            >
              {{ t(path.label) }}
            </NuxtLink>
            <h1 v-else class="text-heading-2 capitalize inline-block">
              {{ t(path.label) }}
            </h1>

            <span v-if="i < breadcrumbs.length - 1" class="text-accent mx-3">
              /
            </span>
          </template>
        </div>
        <p class="py-1 px-3 bg-warning rounded text-primary w-fit h-fit">
          {{ t("Headings.Active") }}
        </p>
      </header>

      <div class="bg-secondary style-box w-fit h-fit"></div>

      <aside
        class="card style-card bg-secondary grid gap-card grid-cols-1 pt-card-sm overflow-auto"
      >
        <ChallengesItemSubmission
          :data="challenge"
          :challengeId="challengeID"
          :codingChallengeId="codingChallengeId"
        />
        <ChallengesItemDescription :data="codingChallenge" />
        <ChallengesItemExamples
          :code="code"
          :environment="environment"
          :examples="examples"
          :challengeId="challengeID"
          :codingChallengeId="codingChallengeId"
        />
      </aside>

      <ChallengesCodeEditor
        :challengeId="challengeID"
        :codingChallengeId="codingChallengeId"
        :showButtons="true"
        @environment="environment = $event"
        :selectedLanguage="environment"
        v-model="code"
        :xp="codingChallenge?.xp"
      />
    </main>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import {
  getSubmissions,
  getSubmission,
  getCodingChallenge,
  useCodingChallenge,
  getExamples,
  useCodingExamples,
} from "~~/composables/codingChallenges";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Solve Challenge",
  },
  setup() {
    const { t } = useI18n();
    const isSolved = ref(false);
    const loading = ref(true);
    const challenge = useChallenge();
    const category = useChallengeCategory();
    const codingChallenge: any = useCodingChallenge();
    const examples: any = useCodingExamples();
    const environment = ref();
    const allCodingChallenges = useAllCodingChallengesInATask();
    const route = useRoute();
    const code = ref("// write your code here");
    const breadcrumbs = computed(() => {
      return [
        {
          label: "Headings.Challenges",
          to: "/challenges/all",
        },
        {
          label: category.value?.title ?? "",
          to: `/challenges/all?category=${category.value?.id ?? ""}&challenge=${
            challenge.value?.id ?? ""
          }`,
        },
        {
          label: challenge.value?.title ?? "",
        },
      ];
    });
    const categoryID = computed((): string => {
      return <string>route?.params?.category ?? "";
    });
    const codingChallengeId: any = computed(() => {
      return route.query?.codingChallenge ?? "";
    });
    const challengeID = computed((): string => {
      return <string>route?.params?.challenge ?? "";
    });
    const heartInfo: any = useHeartInfo();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });

    onMounted(async () => {
      await Promise.all([
        getChallengeCategory(categoryID.value),
        getChallenge(categoryID.value, challengeID.value),
        getSubmissions(challengeID.value, codingChallengeId.value),
        getCodingChallenge(challengeID.value, codingChallengeId.value),
        getExamples(challengeID.value, codingChallengeId.value),
        getHearts(),
        getBalance(),
      ]);
      loading.value = false;
    });
    return {
      t,
      loading,
      challenge,
      category,
      breadcrumbs,
      code,
      environment,
      allCodingChallenges,
      codingChallengeId,
      challengeID,
      codingChallenge,
      examples,
      isSolved,
      hearts,
    };
  },
};
</script>

<style scoped></style>
