<template>
	<header
		class="flex gap-card items-center justify-between flex-wrap capitalize"
		:class="{ 'absolute left-0 top-card w-screen container-fluid': absolute }"
	>
		<div class="py-2 px-4 md:py-3 md:px-6 bg-secondary style-box">
			<template v-for="(path, i) of breadcrumbs" :key="i">
				<NuxtLink v-if="path.to" :to="path.to" class="inline-block text-body-2">
					{{ t(path.label) }}
				</NuxtLink>
				<h1 v-else class="text-heading-2 capitalize inline-block">
					{{ t(path.label) }}
				</h1>

				<span v-if="i < breadcrumbs.length - 1" class="text-accent mx-3">
					/
				</span>
			</template>
		</div>

		<Btn v-if="quizzesQuickStart">View Quizzes for Last View Course</Btn>

		<SkillTreeZoomLevel
			v-if="!noZoomLevel"
			@zoomLevel="emit('zoomLevel', $event)"
		/>
	</header>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		breadcrumbs: { type: Array as PropType<any[]>, default: [] },
		noZoomLevel: { type: Boolean, default: false },
		absolute: { type: Boolean, default: true },
		quizzesQuickStart: { type: Boolean, default: false },
	},
	emits: ['zoomLevel'],
	setup(props, { emit }) {
		const { t } = useI18n();

		return { emit, t };
	},
});
</script>

<style scoped></style>
