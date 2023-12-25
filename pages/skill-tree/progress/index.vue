<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari

❌ Recaptcha
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main class="container mt-main mb-main grid gap-container">
		<section
			v-for="{ heading, body, skills } of rootSkillsProgress"
			:key="heading"
			class="card style-card bg-secondary grid gap-card-sm"
		>
			<SectionTitle sub :heading="heading" :body="body" class="mb-0" />

			<template v-if="loading">
				<SkillTreeProgressSkeleton v-for="n in 3" :key="n" />
			</template>

			<template v-else-if="skills && skills.length > 0">
				<SkillTreeProgress
					v-for="(skill, i) of skills"
					:key="`${heading}-${i}`"
					:data="skill"
				/>
			</template>

			<SkillTreeProgressEmptyState v-else />
		</section>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Skill Progress',
  },
  setup() {
    const { t } = useI18n();

    const xp = useXP();

    const loading = ref(!!!xp.value);

    onMounted(async () => {
      await getXP();
      loading.value = false;
    });

    const rootProgress = computed(() => {
      return xp.value?.progress ?? 0;
    });

    const rootSkills = computed((): any[] => {
      return xp.value?.skills ?? [];
    });

    const rootLevel = computed(() => {
      return xp.value?.level ?? 0;
    });

    const rootXP = computed(() => {
      return xp.value?.xp ?? 0;
    });

    function getRootSkillInformation(rootSkillID: string) {
      let rootSkill = rootSkills.value.find(
        (item) => item.skill == rootSkillID
      );

      return !!rootSkill
        ? {
          ...rootSkill,
				  }
        : null;
    }

    function getSubSkillInformation(rootSkillID: string, subSkillID: string) {
      let rootSkill = getRootSkillInformation(rootSkillID);

      if (!!!rootSkill) return null;

      let subSkill = (rootSkill?.skills ?? []).find(
        (item: any) => item.skill == subSkillID
      );

      return !!subSkill
        ? {
          ...subSkill,
				  }
        : null;
    }

    const rootSkillsProgress = computed(() => {
      return [
        {
          heading: 'Headings.ActiveSkills',
          body: 'Body.ActiveSkills',
          skills: rootSkills.value.filter((skill: any) => skill.progress < 100 && skill.xp > 0),
        },
        {
          heading: 'Headings.CompletedSkills',
          body: 'Body.CompletedSkills',
          skills: rootSkills.value.filter(
            (skill: any) => skill.progress == 100
          ),
        },
        {
          heading: 'Headings.OtherSkills',
          body: 'Body.OtherSkills',
          skills: rootSkills.value.filter((skill: any) => skill.progress < 100 && skill.xp == 0),
        },
      ];
    });

    return { t, loading, xp, rootSkillsProgress };
  },
};
</script>

<style scoped></style>
