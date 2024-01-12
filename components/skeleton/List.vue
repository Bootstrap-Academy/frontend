<template>
	<ul
		class="grid gap-2 md:gap-3"
		:class="{
			checklist: checklist,
			points: points,
		}"
	>
		<li v-for="n in getRandomNumber(2, 5)" :key="`${id}-${n}`">
			<SkeletonText :noAnimate="noAnimate" body class="mt-2.5" />
		</li>
	</ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    list: { type: Boolean, default: true },
    checklist: { type: Boolean, default: false },
    points: { type: Boolean, default: false },
    noAnimate: { type: Boolean, default: false },
    id: { type: String, default: 'skeleton-' },
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
