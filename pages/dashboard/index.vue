<template>
  <main class="container mt-main mb-main grid gap-container">
    <header class="grid gap-2">
      <h1 class="text-heading-1">
        {{ t("Headings.Dashboard") }}
      </h1>
      <p class="text-body-1 text-body">
        {{ t("Body.DashboardIntro") }}
      </p>
    </header>

    <section class="grid gap-card-sm lg:grid-cols-2">
      <div class="card style-card bg-secondary">
        <UserCourses />
      </div>

      <UserChallenges class="lg:col-span-1" />
    </section>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Dashboard",
  },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>

<style scoped></style>
