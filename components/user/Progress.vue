<template>
	<section class="bg-secondary card style-card grid gap-card-sm">
		<div class="flex gap-box items-start justify-between mb-2">
			<SectionTitle
				sub
				:heading="header.heading"
				:body="header.body"
				class="!m-0"
			/>
			<UserXP :data="xp" />
		</div>

		<template v-if="loading">
			<SkillTreeProgressSkeleton v-for="n in 3" :key="n" />
		</template>

		<template v-else-if="arrLastX && arrLastX.length > 0">
			<SkillTreeProgress
				v-for="(skill, i) of arrLastX"
				:key="i"
				:data="skill"
			/>

			<NuxtLink to="/skill-tree/progress" class="mt-4">
				<Btn full class="w-full max-w-[175px]">
					{{ t('Buttons.ViewAll') }}
				</Btn>
			</NuxtLink>
		</template>

		<SkillTreeProgressEmptyState v-else />
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    const xp = useXP();

    const loading = ref(!!!xp.value);

    const header = reactive({
      heading: 'Headings.SkillPoints',
      body: '',
    });

    onMounted(async () => {
      await getXP();
      loading.value = false;

      if (
        activeSkillsProgress.value &&
				activeSkillsProgress.value.length <= 0
      ) {
        Object.assign(header, {
          heading: 'EmptyStates.SkillProgress.Heading',
          body: 'EmptyStates.SkillProgress.Body',
        });
      }
    });

    const arrLastX = computed(() => {
      return activeSkillsProgress.value.splice(0, 3);
    });

    return { t, loading, xp, header, arrLastX };
  },
});
</script>

<style scoped></style>
