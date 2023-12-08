<template>
	<section class="card style-card bg-secondary grid gap-card">
		<article>
			<h2 class="mb-box text-heading-3">{{ t('Headings.Description') }}</h2>
			<p v-if="description">{{ description }}</p>
			<p v-else>{{ t('Error.NoDescriptionAvailable') }}</p>
		</article>

		<article class="mt-card mb-card" v-if="learningGoals.length">
			<h2 class="mb-box text-heading-3">{{ t('Headings.LearningGoals') }}</h2>
			<List checklist :items="learningGoals" id="learningGoals" />
		</article>

		<article v-if="requirements.length">
			<h2 class="mb-box text-heading-3">{{ t('Headings.Requirements') }}</h2>
			<List :items="requirements" id="requirements" />
		</article>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    const description = computed(() => {
      return props.data?.description ?? '';
    });

    const learningGoals = computed(() => {
      return props.data?.learning_goals ?? [];
    });

    const requirements = computed(() => {
      return props.data?.requirements ?? [];
    });

    return {
      description,
      learningGoals,
      requirements,
      t,
    };
  },
});
</script>

<style scoped></style>
