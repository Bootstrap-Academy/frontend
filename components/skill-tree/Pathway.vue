<template>
	<g>
		<path
			:d="pathway"
			:stroke-width="strokeWidth"
			class="cursor-pointer transition-all duration-200 ease-out origin-bottom stroke-secondary hover:stroke-accent"
		/>

		<defs>
			<marker
				id="arrowhead"
				:markerWidth="triangle.markerWidth"
				:markerHeight="triangle.markerHeight"
				:refX="triangle.refX"
				:refY="triangle.refY"
				orient="auto"
			>
				<polygon :points="triangle.points" class="fill-secondary" />
			</marker>
			<marker
				id="hover-arrowhead"
				:markerWidth="triangle.markerWidth"
				:markerHeight="triangle.markerHeight"
				:refX="triangle.refX"
				:refY="triangle.refY"
				orient="auto"
			>
				<polygon :points="triangle.points" class="fill-accent" />
			</marker>
		</defs>
	</g>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    pathway: { type: String, default: '' },
  },
  setup(props) {
    const triangle = reactive({
      markerWidth: 3,
      markerHeight: 3,
      refX: -10,
      refY: 1.5,
      points: '3 0, 3 3, 0 1.5',
    });

    const strokeWidth = 8;

    return { triangle, strokeWidth };
  },
});
</script>

<style scoped>
path {
	marker-start: url('#arrowhead');
}
path:hover {
	marker-start: url('#hover-arrowhead');
}
</style>
