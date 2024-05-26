<template>
	<section class="relative h-7.5 w-screen overflow-clip" :class="color">
		<article class="container-fluid flex justify-end gap-3 py-1.5 h-fit">
			<img
				@click="locale = 'en-US'"
				src="/images/en.webp"
				:alt="t('AltAttributes.EnglishTranslation')"
				class="transition duration-200 ease-out cursor-pointer w-4 h-4 rounded-3xl object-cover"
				:class="locale == 'en-US' ? 'opacity-100' : 'opacity-60'"
			/>

			<img
				@click="locale = 'de'"
				src="/images/de.webp"
				:alt="t('AltAttributes.GermanTranslation')"
				class="transition duration-200 ease-out cursor-pointer w-4 h-4 rounded-3xl object-cover"
				:class="locale == 'de' ? 'opacity-100' : 'opacity-60'"
			/>
		</article>
	</section>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

export default {
  props: {
    color: { type: String, default: 'bg-tertiary' },
  },
  setup() {
    const { t, locale } = useI18n();

    const cookie_locale = useCookie('locale');

    watch(
      () => locale.value,
      (newValue, oldValue) => {
        cookie_locale.value = newValue;
      },
      { deep: true, immediate: true }
    );

    return { locale, t };
  },
};
</script>

<style scoped></style>
