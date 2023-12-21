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
    zoomLevel: { default: 2 },
  },
  setup(props) {
    const triangle = reactive({
      markerWidth: 3,
      markerHeight: 3,
      refX: -7,
      refY: 1.5,
      points: '3 0, 3 3, 0 1.5',
    });

    const strokeWidth = computed(() => {
      switch (props.zoomLevel) {
      case 5:
        triangle.refY = 1.5;
        triangle.refX = -25;
        return 10;
      case 4:
        triangle.refY = 1.5;
        triangle.refX = -20;
        return 8;
      case 3:
        triangle.refY = 1.5;
        triangle.refX = -15;
        return 8;
      case 2:
        triangle.refY = 1.5;
        triangle.refX = -10;
        return 8;
      default:
        triangle.refY = 1.5;
        triangle.refX = -3.5;
        return 8;
      }
    });

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
