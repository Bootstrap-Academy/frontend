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
    class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
  >
    <p>{{ codingChallenges }}</p>
    <section class="flex items-center justify-end mb-3">
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
        Challenge
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
        Coding Challenges
      </article>
    </section>

    <section v-if="selectedTab == 0" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.EditChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <FormChallenge :data="challengeData" />
    </section>

    <!-- <section v-else-if="selectedTab == 1" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.EditChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <CodingChallengeList :codingChallenges="codingChallenges" />
    </section> -->
  </main>
</template>

<script lang="ts">
import { getChallenge } from "~~/composables/challenges";
import { PencilIcon } from "@heroicons/vue/24/outline";
import { getAllCodingChallengesInATask } from "~~/composables/codingChallenges";
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
    const selectedTab = ref(0);
    const route = useRoute();
    const challengeData = ref();
    const codingChallenges = ref();
    const challengeId: any = computed(() => {
      return route.params.challenge;
    });
    const categoryId: any = computed(() => {
      return route.query.categoryId;
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
      if (!!codingSuccess) codingChallenges.value = codingSuccess;
    });
    return {
      challengeId,
      categoryId,
      challengeData,
      selectedTab,
      PencilIcon,
      codingChallenges,
    };
  },
};
</script>

<style scoped></style>
