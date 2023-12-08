<template>
	<svg :x="cx" :y="cy" ref="nodeRef" @click="ondblclick">
		<SkillTreeNodeSvg
			v-if="isFilled"
			:size="nodeSize"
			:node="node"
			:active="active"
			:completed="completed"
		/>

		<foreignObject
			v-if="zoomLevel != 1 && isFilled"
			x="0"
			:y="nodeSize - 10"
			:width="nodeSize"
			:height="active || completed ? 200 : 100"
		>
			<h6
				class="origin-center select-none transition-all duration-500 ease-in-out text-center w-full h-auto pointer-events-none capitalize"
				:class="{
					'pt-6': active,
					'pt-7': completed,
					'pt-2': !active && !completed,
					'text-heading-3': zoomLevel == 5,
					'text-heading-4': zoomLevel == 4,
					'text-heading-5': zoomLevel == 3,
					'text-body-2': zoomLevel == 2,
				}"
				v-if="node && node.name != 'start'"
			>
				{{ node?.name ?? '' }}
			</h6>
		</foreignObject>
	</svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    active: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    node: { type: Object as PropType<any>, default: null },
    selectedNode: { default: null },
    row: { type: Number, default: 0 },
    column: { type: Number, default: 0 },
    zoomLevel: { type: Number, default: 2 },
    viewSubtree: { type: Boolean, default: false },
    viewSkill: { type: Boolean, default: false },
  },
  emits: ['node', 'size', 'selected', 'move', 'ref'],
  setup(props, { emit }) {
    let occupiedSpace = 3;

    const size = computed(() => {
      switch (props.zoomLevel) {
      case 5:
        return 125;
      case 4:
        return 100;
      case 3:
        return 75;
      case 2:
        return 50;
      default:
        return 25;
      }
    });

    const nodeSize = computed(() => {
      emit('size', size.value * occupiedSpace);
      return size.value * occupiedSpace;
    });

    const cx = computed(() => {
      return props.row * occupiedSpace * size.value;
    });
    const cy = computed(() => {
      return props.column * occupiedSpace * size.value;
    });

    const nodeRef = ref<SVGElement | null>(null);

    const current_node = computed(() => {
      return {
        id: props.node?.id ?? '',
        name: props.node?.name ?? '',
        dependencies: props.node?.dependencies ?? [],
        row: props.node?.row ?? props.row,
        column: props.node?.column ?? props.column,
        icon: props.node?.icon ?? '',
      };
    });

    onMounted(() => {
      emit('ref', nodeRef.value);
    });

    const router = useRouter();

    function ondblclick() {
      if (!!!current_node.value.id) return;

      if (props.active) {
        emit('move', {
          id: '',
          name: '',
          dependencies: [],
          row: null,
          column: null,
          icon: '',
        });
      } else {
        emit('move', current_node.value);
      }

      if (props.viewSubtree) {
        router.push(`/skill-tree/${current_node.value.id}`);
      }
    }

    const isFilled = computed(() => {
      return !!current_node.value.id;
    });

    return {
      current_node,
      nodeRef,
      cx,
      cy,
      size,
      nodeSize,
      ondblclick,
      isFilled,
      occupiedSpace,
    };
  },
});
</script>

<style scoped></style>
