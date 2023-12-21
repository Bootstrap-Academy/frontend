<template>
	<section
		@click="onclickToggleBoxBody"
		class="border-b-2 border-tertiary overflow-hidden py-3 md:py-6 cursor-pointer"
	>
		<h3 class="flex justify-between text-heading-4">
			{{ t(heading) }}
			<ChevronDownIcon
				class="transition duration-500 ease-out origin-center h-5 w-5 flex-shrink-0"
				:class="{ 'rotate-180 text-accent': expand }"
			/>
		</h3>

		<article
			ref="article"
			:style="{ maxHeight: max_height }"
			class="transition-all duration-500 ease-out overflow-hidden"
		>
			<p class="mt-2 text-body-1 font-body text-body">
				{{ t(body) }}
				<NuxtLink
					v-if="link && link.to && link.text"
					:to="link.to"
					class="hover:text-white border-b-2 border-accent lowercase inline-block"
				>
					{{ t(link.text) }}
				</NuxtLink>
			</p>
		</article>
	</section>
</template>

<script>
import { defineComponent, ref } from 'vue';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: { ChevronDownIcon },
  props: {
    expand: { type: Boolean, default: false },
    heading: { type: String, default: '' },
    body: { type: String, default: '' },
    link: { default: null },
  },
  emits: ['expand'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const article = ref(null);

    const max_height = computed(() => {
      return props.expand ? `${article?.value?.scrollHeight ?? 0}px` : `0px`;
    });

    function onclickToggleBoxBody() {
      emit('expand', !props.expand);
    }
    return { onclickToggleBoxBody, article, max_height, t };
  },
});
</script>

<style lang="scss" scoped></style>
