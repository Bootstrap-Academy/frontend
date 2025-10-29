<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅  Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state 

✅ Api implemented
-->

<template>
  <div>
    <Head>
      <Title>Job Details - {{ job?.title ?? "" }}</Title>
    </Head>

    <JobSkeleton v-if="loading" />

    <main
      v-else-if="job"
      class="container-fluid grid grid-cols-1 items-start gap-container pt-container pb-container md:grid-cols-[1fr_250px] xl:grid-cols-[1fr_350px]"
    >
      <JobHeader :data="job" />

      <section>
        <h2 class="text-heading-3 mb-box">{{ t("Headings.JobDetails") }}</h2>
        <JobDetails :data="job" />
      </section>

      <section class="md:container-top md:sticky md:self-start">
        <h2 class="text-heading-3 mb-box">{{ t("Headings.JobOverview") }}</h2>
        <JobOverview :data="job" />
      </section>
    </main>

    <JobEmptyState v-else />
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  setup() {
    const { t } = useI18n();

    const loading = ref(true);

    const job = useJob();

    const route = useRoute();
    const jobID = computed((): string => {
      return <string>route?.params?.id ?? "";
    });

    onMounted(async () => {
      await getJob(jobID.value);
      loading.value = false;
    });

    return { t, loading, job };
  },
};
</script>

<style scoped></style>
