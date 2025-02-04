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

      <aside
        class="card style-card bg-secondary grid gap-card grid-cols-1 pt-card-sm overflow-auto min-h-[85vh]"
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
import {
  useDialogCodingChallengeFeedback,
  useDialogSlot,
} from "~~/composables/dialogSlot";

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
    const loading = ref(true);
    const challenge = useChallenge();
    const codingChallenge = useCodingChallenge();
    const examples: any = useCodingExamples();
    const environment = ref();
    const allCodingChallenges = useAllCodingChallengesInATask();
    const route = useRoute();
    const code = ref("// write your code here");
    const challengeID = computed((): string => {
      return <string>route?.params?.challenge ?? "";
    });
    const codingChallengeId: any = computed(() => {
      return route.query?.codingChallenge ?? "";
    });
    const heartInfo: any = useHeartInfo();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });

    onMounted(async () => {
      await Promise.all([
        getHearts(),
        getSubmissions(challengeID.value, codingChallengeId.value),
        getCodingChallenge(challengeID.value, codingChallengeId.value),
        getExamples(challengeID.value, codingChallengeId.value),
      ]);
      loading.value = false;
    });

    return {
      t,
      loading,
      challenge,
      code,
      environment,
      allCodingChallenges,
      codingChallengeId,
      challengeID,
      hearts,
      codingChallenge,
      examples,
    };
  },
};
</script>

<style scoped></style>
