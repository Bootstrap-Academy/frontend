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

    <div class="bg-secondary style-box w-fit h-fit">
      <ChallengesItemProgress
        :data="challenge"
        class="!w-fit justify-self-end"
      />
    </div>

    <aside
      class="card style-card bg-secondary grid gap-card grid-cols-1 pt-card-sm overflow-scroll"
    >
      <ChallengesItemTasks :data="challenge" />
      <ChallengesItemSubmission :data="challenge" />
      <ChallengesItemDescription :data="challenge" />
      <ChallengesItemLimits :data="challenge" />
      <ChallengesItemExamples :data="challenge" />
    </aside>

    <ChallengesCodeEditor :showButtons="true" v-model="code" />
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

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
    const category = useChallengeCategory();

    const route = useRoute();
    const categoryID = computed((): string => {
      return <string>route?.params?.category ?? "";
    });
    const challengeID = computed((): string => {
      return <string>route?.params?.challenge ?? "";
    });

    onMounted(async () => {
      await Promise.all([
        getChallengeCategory(categoryID.value),
        getChallenge(categoryID.value, challengeID.value),
      ]);
      loading.value = false;
    });

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

    const code = ref("// write your code here");

    return {
      t,
      loading,
      challenge,
      category,
      breadcrumbs,
      code,
    };
  },
};
</script>

<style scoped></style>
