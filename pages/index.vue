<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Display data
-->

<template>
	<main ref="aos" class="grid gap-container allow-scroll h-auto">
		<HeroLanding class="pt-container" />
		<HeroSponsors />
		<HeroAbout class="pt-container" />
		<HeroFeatures class="pt-container" />
		<HeroFAQS class="pt-container mb-main pb-container" />
	</main>
</template>

<script lang="ts">
export default {
  head: {
    title: 'Bootstrap Academy',
  },
  setup() {
    const aos = ref<HTMLDivElement | null>(null);

    onMounted(() => {
      setAOSViaParent(aos.value, 'aos', 'show', [3]);
    });

    return { aos };
  },
};
</script>

<style scoped></style>
