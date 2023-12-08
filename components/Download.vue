<template>
	<section class="relative overflow-hidden shadow-lg">
		<SvgDownload />
		<section
			class="container-fluid min-h-[10rem] py-[5vw] sm:py-6 md:py-8 relative z-10 flex flex-col md:flex-row gap-5 md:gap-container items-center justify-center md:justify-between"
		>
			<h2 class="text-white text-center text-heading-1">
				{{ t('Body.ComingSoon') }}
			</h2>
			<article class="flex gap-3 md:gap-4 xl:gap-5">
				<div class="w-32 md:w-40 xl:w-48"><SvgBtnApple /></div>
				<div class="w-32 md:w-40 xl:w-48"><SvgBtnGoogle /></div>
			</article>
		</section>
	</section>
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
