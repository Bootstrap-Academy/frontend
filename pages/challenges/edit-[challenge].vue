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
    <section class="flex justify-center">
      <InputButtonToggle
        :buttonOptions="buttonOptions"
        v-model="selectedTab"
      />
    </section>

    <section v-if="selectedTab == 0" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.EditChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <article></article>
      <LazyFormChallenge v-if="challengeData" :data="challengeData" />
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

    const buttonOptions = [
      {
        name: "Headings.Challenge"
      },
      {
        name: "Headings.CodingChallenge"
      },
    ];

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
      buttonOptions
    };
  },
};
</script>
