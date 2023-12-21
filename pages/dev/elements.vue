<template>
	<main
		class="container grid gap-container justify-items-center pt-container pb-container"
	>
		<div class="grid place-items-center gap-card">
			<article class="flex gap-box items-center flex-wrap">
				<Btn lg>primary lg</Btn>
				<Btn>primary md</Btn>
				<Btn sm :icon="ArrowRightIcon" icon-right>primary sm</Btn>
			</article>

			<article class="flex gap-box items-center flex-wrap">
				<Btn secondary lg :icon="ArrowLeftIcon">secondary lg</Btn>
				<Btn secondary>secondary md</Btn>
				<Btn secondary sm>secondary sm</Btn>
			</article>

			<article class="flex gap-box items-center flex-wrap">
				<Btn tertiary lg>tertiary lg</Btn>
				<Btn tertiary :icon="ArrowRightIcon" icon-right>tertiary md</Btn>
				<Btn tertiary sm>tertiary sm</Btn>
			</article>
		</div>

		<article class="flex flex-wrap gap-card items-center">
			<Chip lg>Chip lg</Chip>
			<Chip md>Chip md</Chip>
			<Chip :icon="ArrowRightIcon" icon-right>Chip sm</Chip>
		</article>

		<article class="flex flex-wrap gap-card items-center">
			<Chip v-for="n in 12" :key="n" :color="`chip-color-${n}`">
				Chip {{ n }}
			</Chip>
		</article>

		<article class="grid gap-card justify-items-center">
			<NuxtLink to="/dev/typography" class="link">
				Want to see typography
				<span class="text-accent">Create one.</span>
			</NuxtLink>

			<NuxtLink to="/dev/form" class="link">form</NuxtLink>

			<a href="https://www.google.com/" target="_blank">Go to google</a>
		</article>
	</main>
</template>

<script>
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/vue/24/solid';

definePageMeta({
  layout: 'inner',
});

export default {
  components: { ArrowRightIcon, ArrowLeftIcon },
  head: {
    title: 'Elements',
  },
  setup() {
    return { ArrowRightIcon, ArrowLeftIcon };
  },
};
</script>

<style lang="scss" scoped></style>
