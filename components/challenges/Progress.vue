<template>
	<article class="grid gap-2">
		<!--  box style-box bg-secondary -->
		<h3 class="text-body-1">{{ data?.heading }}</h3>
		<p class="text-right">{{ value }} / {{ max }}</p>
		<progress
			:id="data?.heading"
			:value="value"
			:max="max"
			class="w-full col-span-2"
			:class="{ 'loading transition-basic animate-pulse': loading }"
		></progress>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

interface PropData {
	heading: string;
	current: number;
	total: number;
}

export default defineComponent({
  props: {
    data: { type: Object as PropType<PropData | null>, default: null },
    loading: { type: Boolean, default: true },
  },
  setup(props) {
    const { t } = useI18n();

    const DEFAULT_MAX_VALUE = 10;

    const value = computed(() => {
      return props.data?.current ?? getRandomNumber(1, DEFAULT_MAX_VALUE - 1);
    });

    const max = computed(() => {
      return props.data?.total ?? DEFAULT_MAX_VALUE;
    });

    return { t, value, max };
  },
});
</script>

<style scoped>
progress {
	background-color: var(--color-primary);
	border-radius: 1rem;
	-webkit-transition: all 0.5s ease-in-out;
	-moz-transition: all 0.5s ease-in-out;
	-o-transition: all 0.5s ease-in-out;
	transition: all 0.5s ease-in-out;
}
progress::-webkit-progress-bar {
	background-color: var(--color-primary);
	border-radius: 1rem;
	-webkit-transition: all 0.5s ease-in-out;
	-moz-transition: all 0.5s ease-in-out;
	-o-transition: all 0.5s ease-in-out;
	transition: all 0.5s ease-in-out;
}
progress::-webkit-progress-value {
	background-color: var(--color-accent);
	/* background-color: #546bed; */
	border-radius: 1rem;
	-webkit-transition: width 0.5s ease-in-out;
	-moz-transition: width 0.5s ease-in-out;
	-o-transition: width 0.5s ease-in-out;
	transition: width 0.5s ease-in-out;
}
progress::-moz-progress-bar {
	background-color: var(--color-accent);
	/* background-color: #546bed; */
	border-radius: 1rem;
	-webkit-transition: width 0.5s ease-in-out;
	-moz-transition: width 0.5s ease-in-out;
	-o-transition: width 0.5s ease-in-out;
	transition: width 0.5s ease-in-out;
}
progress.loading::-webkit-progress-value {
	background-color: #2e405a;
}
progress.loading::-moz-progress-bar {
	background-color: #2e405a;
}
</style>
