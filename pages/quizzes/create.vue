<template>
	<main></main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
	layout: 'inner',
	title: 'Create Quiz',
});

export default {
	setup() {
		const { t } = useI18n();

		return { t };
	},
};
</script>

<style scoped></style>
