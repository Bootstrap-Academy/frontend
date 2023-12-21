<template>
	<article>
		<h4 class="text-heading-3">{{ t('Headings.Description') }}</h4>
		<div
			class="markdown"
			v-if="typeof description == 'string'"
			v-html="$md.render(description)"
		></div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    const description = computed(() => {
      return props.data?.description ?? '';
    });

    return { t, description };
  },
});
</script>

<style scoped></style>
