<template>
	<article class="bg-secondary style-card overflow-hidden">
		<SkeletonMedia class="w-full h-32" />

		<div class="card-sm">
			<SkeletonText />
			<SkeletonText body sm class="mt-box" />
			<SkeletonText body sm class="mt-2" />
		</div>
		<hr />
		<div class="flex justify-between card-sm">
			<IconText :highlightIcon="false" sm :icon="price.icon">
				morphcoins
			</IconText>

			<IconText :highlightIcon="false" sm :icon="lectures.icon">
				lectures
			</IconText>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PlayIcon } from '@heroicons/vue/24/outline';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';

export default defineComponent({
  components: { PlayIcon, IconMorphcoin },

  setup(props) {
    const price = computed(() => {
      return {
        icon: IconMorphcoin,
      };
    });

    const lectures = computed(() => {
      return {
        icon: PlayIcon,
      };
    });

    return { price, lectures };
  },
});
</script>

<style scoped></style>
