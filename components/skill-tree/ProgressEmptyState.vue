<template>
	<!-- <SkillTreeProgressSkeleton no-animate /> -->
	<NuxtLink to="/skill-tree">
		<Btn class="w-fit">{{ t('Links.ExploreSkillTree') }}</Btn>
	</NuxtLink>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
