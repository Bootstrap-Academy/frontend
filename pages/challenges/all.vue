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
    class="grid grid-cols-1 gap-card container h-screen-inner min pb-container pt-container"
  >
    <!-- <p
      class="mb-card box bg-info-light text-info h-fit w-fit style-box flex gap-3 text-body-1"
    >
      <InformationCircleIcon class="h-6 w-6 md:h-8 md:w-8 flex-shrink-0" />
      <span class="md:mt-1">{{ t("Body.AddChallengeRequirement") }}</span>
    </p> -->
    <template v-for="(category, i) of challengesCategories" :key="category.id">
      <ChallengesCategory :xp="xp" :data="category" />
      <hr class="mt-box" v-if="i < challengesCategories.length - 1" />
    </template>
  </main>
</template>

<script lang="ts">
import { InformationCircleIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "All Challenges",
  },
  components: { InformationCircleIcon },
  setup() {
    const { t } = useI18n();
    const challengesCategories = useChallengesCategories();
    const loading = ref(challengesCategories.value.length <= 0);
    const xp = useXP();
    onMounted(async () => {
      await getChallengesCategories();
      await getXP();
      loading.value = false;
    });
    return { t, loading, challengesCategories, xp };
  },
};
</script>

<style scoped></style>
