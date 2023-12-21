<template>
	<ul
		class="grid gap-2 md:gap-3"
		:class="{
			checklist: checklist,
			points: points,
		}"
	>
		<li v-for="(item, i) of items" :key="`${id}-${i}`">
			<NuxtLink
				v-if="item.text && item.link"
				:to="item.link"
				class="cursor-pointer"
				target="_blank"
			>
				{{ item.text }}
			</NuxtLink>
			<span v-else>{{ $t(item) }}</span>
		</li>
	</ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    items: { default: Array as PropType<any[]> },
    list: { type: Boolean, default: true },
    checklist: { type: Boolean, default: false },
    points: { type: Boolean, default: false },
    link: { type: Boolean, default: false },
    id: { type: String, default: 'list-' },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
ul {
	position: relative;
	list-style: none !important;
}
ul li {
	display: grid;
	grid-template-columns: 5px 1fr;
	gap: 1.25em;
	align-items: start;
}
ul li::before {
	content: '•';
}
ul.checklist li::before {
	content: '✔';
}
ul.points li::before {
	content: '→';
}
</style>
