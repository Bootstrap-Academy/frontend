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
  <main
    class="grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_minmax(0,70vh)] md:grid-rows-[auto_minmax(0,1fr)] gap-card card md:h-screen-inner"
  >
    <Head>
      <Title>Solve Challenge - {{ challenge?.title ?? "" }}</Title>
    </Head>

    <header class="w-fit flex items-items gap-card">
      <p class="py-1 px-3 bg-warning rounded text-primary w-fit h-fit">
        {{ t("Headings.Active") }}
      </p>
    </header>

    <div class="bg-secondary style-box w-fit h-fit">
      <ChallengesItemProgress
        :data="challenge"
        class="!w-fit justify-self-end"
      />
    </div>

    <aside
      class="card style-card bg-secondary grid gap-card grid-cols-1 pt-card-sm overflow-scroll"
    >
      <ChallengesItemSubmission
        :data="challenge"
        @id="watchSubmissionEmition($event)"
      />
      <ChallengesItemDescription :data="codingChallenge" />
      <ChallengesItemLimits :data="codingChallenge" />
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
      v-model="code"
    />
  </main>
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
    const loading = ref(true);

    const challenge = useChallenge();
    const codingChallenge = useCodingChallenge();
    const examples: any = useCodingExamples();

    const environment = ref();
    const allCodingChallenges = useAllCodingChallengesInATask();

    const route = useRoute();

    const challengeID = computed((): string => {
      return <string>route?.params?.challenge ?? "";
    });
    const codingChallengeId: any = computed(() => {
      return route.query?.codingChallenge ?? "";
    });

    async function watchSubmissionEmition(id: any) {
      const [success, error] = await getSubmission(
        challengeID.value,
        codingChallengeId.value,
        id
      );

      if (!!success) {
      } else openSnackbar("error", error);
    }

    onMounted(async () => {
      await Promise.all([
        getSubmissions(challengeID.value, codingChallengeId.value),
        getCodingChallenge(challengeID.value, codingChallengeId.value),
        getExamples(challengeID.value, codingChallengeId.value),
      ]);
      loading.value = false;
    });

    const code = ref("// write your code here");

    return {
      t,
      loading,
      challenge,
      code,
      environment,
      allCodingChallenges,
      codingChallengeId,
      watchSubmissionEmition,
      challengeID,
      codingChallenge,
      examples,
    };
  },
};
</script>

<style scoped></style>
