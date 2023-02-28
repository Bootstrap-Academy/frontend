<template>
	<section></section>
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
