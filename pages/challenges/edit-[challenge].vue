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
    class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr] grid place-items-center"
  >
    <!-- <p>{{ codingChallenges }}</p> -->
    <section class="flex gap-3 items-center justify-end mb-3">
      <article
        class="text-white font-medium sm:text-xl sm:px-5 pb-1 cursor-pointer border-b-2"
        :class="
          selectedTab == 0
            ? 'border-b-accent'
            : ' border-black hover:border-tertiary'
        "
        @click="selectedTab = 0"
      >
        <PencilIcon class="h-5 w-5 text-accent inline-block mr-2" />
        {{ $t("Headings.Challenge") }}
      </article>
      <article
        class="text-white font-medium sm:text-xl sm:px-5 pb-1 cursor-pointer border-b-2"
        :class="
          selectedTab == 1
            ? 'border-b-accent'
            : ' border-black hover:border-tertiary'
        "
        @click="selectedTab = 1"
      >
        {{ $t("Headings.CodingChallenge") }}
      </article>
    </section>

    <section v-if="selectedTab == 0" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.EditChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <article></article>
      <LazyFormChallenge :data="challengeData" />
    </section>

    <section v-else-if="selectedTab == 1" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.EditCodingChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <LazyCodingChallengeEditableList
        :challengeId="challengeId"
        :codingChallenges="codingChallenges"
      />
    </section>
  </main>
</template>

<script lang="ts">
import { getChallenge } from "~~/composables/challenges";
import { PencilIcon } from "@heroicons/vue/24/outline";
import {
  getAllCodingChallengesInATask,
  useAllCodingChallengesInATask,
} from "~~/composables/codingChallenges";
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Edit Challenge",
  },

  components: { PencilIcon },
  setup() {
    const { t } = useI18n();
    const selectedTab = ref(0);
    const route = useRoute();
    const router = useRouter();
    const challengeData = ref();
    const codingChallenges = useAllCodingChallengesInATask();
    const challengeId: any = computed(() => {
      return route.params.challenge;
    });
    const categoryId: any = computed(() => {
      return route.query.category;
    });

    onMounted(async () => {
      const [success, error] = await getChallenge(
        categoryId.value,
        challengeId.value
      );
      const [codingSuccess, codingError] = await getAllCodingChallengesInATask(
        challengeId.value
      );

      if (!!success) challengeData.value = success;
      else {
        openSnackbar("error", error?.detail);
        router.push(`/challenges/all?category=${route.query.category ?? ""}`);
      }
    });
    return {
      challengeId,
      categoryId,
      challengeData,
      selectedTab,
      PencilIcon,
      codingChallenges,
      t,
    };
  },
};
</script>

<style scoped></style>
