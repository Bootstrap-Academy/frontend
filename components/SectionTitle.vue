<template>
	<header class="grid gap-2 grid-cols-[1fr_auto] mb-4" v-if="sub">
		<h2 class="md:self-center text-heading-2">{{ t(heading) }}</h2>
		<NuxtLink v-if="link && link.to && link.text" :to="link?.to ?? ''">
			<Btn secondary sm>{{ t(link.text) }}</Btn>
		</NuxtLink>
		<p class="text-body-2 col-span-2 hidden md:block">{{ t(body) }}</p>
	</header>

	<header :class="{ 'text-center': center, 'max-w-xl': !full }" v-else>
		<h1 v-if="size == 'xl'" class="mb-4 md:mb-6 text-display-2 leading-tight">
			<strong class="text-subheading-1 mb-2 md:mb-4 block">
				{{ t(subheading) }}
			</strong>
			{{ t(heading) }}
		</h1>

		<h1 v-else-if="size == 'lg'" class="mb-5 text-heading-1">
			<strong class="text-subheading-1 mb-2 block">{{ t(subheading) }}</strong>
			{{ t(heading) }}
		</h1>
		
		<h3 v-else-if="size == 'sm'" class="mb-2 text-heading-2">
			<strong class="text-xs md:text-sm mb-2 text-accent block">
				{{ t(subheading) }}
			</strong>
			{{ t(heading) }}
		</h3>
		<h2 v-else class="mb-box leading-normal text-heading-1">
			<strong class="text-subheading-1 mb-1 xl:mb-2 block">
				{{ t(subheading) }}
			</strong>
			{{ t(heading) }}
		</h2>
		<p>{{ t(body) }}</p>
	</header>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    size: { type: String, default: 'md' },
    center: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    heading: { type: String, default: `` },
    subheading: { type: String, default: `` },
    body: { type: String, default: `` },
    sub: { type: Boolean, default: false },
    noLink: { type: Boolean, default: false },
    link: { default: { to: '', text: '' } },
  },
  setup(props) {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
