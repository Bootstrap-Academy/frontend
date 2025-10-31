<template>
  <section class="grid gap-card-sm">
    <header class="grid gap-1">
      <h2 class="text-heading-2">
        {{ t("Headings.SkillTreeOverview") }}
      </h2>
      <p class="text-body-2 text-body">
        {{ t("Body.SkillTreeOverview") }}
      </p>
    </header>

    <article
      v-for="{ heading, body, skills } in rootSkillsProgress"
      :key="heading"
      class="card grid bg-secondary gap-card-sm style-card"
    >
      <SectionTitle sub :heading="heading" :body="body" class="mb-0" />

      <template v-if="loading">
        <SkillTreeProgressSkeleton v-for="n in 3" :key="`skeleton-${heading}-${n}`" />
      </template>

      <template v-else-if="skills && skills.length > 0">
        <SkillTreeProgress
          v-for="(skill, index) in skills"
          :key="`${heading}-${index}`"
          :data="skill"
        />
      </template>

      <SkillTreeProgressEmptyState v-else />
    </article>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

export default {
  setup() {
    const { t } = useI18n();

    const xp = useXP();
    const loading = ref(!xp.value);

    onMounted(async () => {
      if (!xp.value) {
        await getXP();
      }
      loading.value = false;
    });

    const rootSkills = computed((): any[] => {
      return xp.value?.skills ?? [];
    });

    const rootSkillsProgress = computed(() => {
      return [
        {
          heading: "Headings.ActiveSkills",
          body: "Body.ActiveSkills",
          skills: rootSkills.value.filter((skill: any) => skill.progress < 100 && skill.xp > 0),
        },
        {
          heading: "Headings.CompletedSkills",
          body: "Body.CompletedSkills",
          skills: rootSkills.value.filter((skill: any) => skill.progress === 100),
        },
        {
          heading: "Headings.OtherSkills",
          body: "Body.OtherSkills",
          skills: rootSkills.value.filter((skill: any) => skill.progress < 100 && skill.xp === 0),
        },
      ];
    });

    return { t, loading, rootSkillsProgress };
  },
};
</script>

<style scoped></style>
