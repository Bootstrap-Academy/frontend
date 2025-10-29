<template>
  <main
    class="container-fluid grid grid-cols-1 items-start gap-container pt-container pb-container md:grid-cols-[1fr_250px] xl:grid-cols-[1fr_350px]"
  >
    <section class="relative h-fit rounded bg-secondary shadow-xl md:col-span-2">
      <SkeletonMedia class="h-52 w-full" />

      <article class="card bg-secondary style-card">
        <div class="flex flex-wrap-reverse items-center justify-between gap-card">
          <div class="text-subheading-1 mb-0 flex items-center text-accent gap-box">
            <SkeletonMedia class="h-7 w-7 rounded-3xl" />

            <SkeletonText sm />
          </div>

          <div class="w-[50px] animate-pulse rounded-3xl bg-[#42546e] p-1 transition-basic"></div>
        </div>

        <SkeletonText lg class="flex-shrink-0 mt-box mb-card-sm" />

        <article class="flex flex-wrap items-center gap-card">
          <IconText v-for="(stat, i) of statsHeader" :key="i" :icon="stat.icon" sm>
            <div
              class="mt-1.5 w-[50px] animate-pulse rounded-3xl bg-[#42546e] p-1 transition-basic"
            ></div>
          </IconText>
        </article>
      </article>

      <Btn class="absolute top-card right-card">
        {{ t("Buttons.ApplyNow") }}
      </Btn>
    </section>

    <div>
      <h2 class="text-heading-3 mb-box">{{ t("Headings.JobDetails") }}</h2>
      <section class="card grid bg-secondary style-card gap-card">
        <article>
          <h2 class="text-heading-3 mb-box">{{ t("Headings.Description") }}</h2>
          <SkeletonText body />
          <SkeletonText body class="mt-box mb-box" />
          <SkeletonText body />
        </article>

        <article>
          <h2 class="text-heading-3 mb-box">
            {{ t("Headings.Responsibilities") }}
          </h2>

          <SkeletonList id="SkeletonResponsibilities" />
        </article>

        <article>
          <h2 class="text-heading-3 mb-box">
            {{ t("Headings.SkillRequirements") }}
          </h2>
          <SkeletonList id="SkeletonSkillRequirements" points />
        </article>
      </section>
    </div>

    <div class="md:container-top md:sticky md:self-start">
      <h2 class="text-heading-3 mb-box">{{ t("Headings.JobOverview") }}</h2>
      <section class="card grid bg-secondary style-card gap-card">
        <article v-for="(stat, i) of statsOverview" :key="i">
          <p class="text-sm">{{ t(stat.heading) }}</p>
          <Chip v-if="stat.chip" color="bg-info" class="mt-3 w-fit">
            <span class="text-info">Remote</span>
          </Chip>
          <SkeletonText v-else class="mt-3 max-w-[80%]" />
        </article>
      </section>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  components: { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon },
  setup() {
    const { t } = useI18n();

    const statsHeader = computed(() => {
      return [
        {
          icon: CurrencyDollarIcon,
        },
        {
          icon: BriefcaseIcon,
        },
        {
          icon: MapPinIcon,
        },
      ];
    });

    const statsOverview = computed(() => {
      return [
        {
          heading: "Headings.Experience",
        },
        {
          heading: "Headings.ProfessionalLevel",
        },
        {
          heading: "Headings.EmploymentType",
        },
        {
          heading: "Headings.OfferSalary",
        },
        {
          heading: "Headings.Location",
        },
        {
          heading: "Headings.JobEnvironment",
          chip: true,
        },
        {
          heading: "Headings.Contact",
        },
        {
          heading: "Headings.LastUpdated",
        },
      ];
    });

    return { t, statsHeader, statsOverview };
  },
});
</script>

<style scoped></style>
