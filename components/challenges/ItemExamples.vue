<template>
	<article>
		<h4 class="text-heading-3 mb-3">{{ t('Headings.Examples') }}</h4>

		<article
			v-for="(example, i) of examples"
			:key="`example-${i}`"
			class="border-2 rounded border-primary mt-4 bg-primary cursor-pointer"
		>
			<h5 class="text-heading-4 box" @click="toggleShowExample(i)">
				[#{{ i + 1 }}] {{ example.heading ? example.heading : 'Example' }}
			</h5>
			<div v-if="activeExample == i" class="box">
				<h6 class="text-heading-5">{{ t('Headings.Input') }}</h6>
				<div v-html="$md.render(example.input)" class="markdown"></div>

				<hr class="mt-box mb-box" />

				<h6 class="text-heading-5">
					{{ t('Headings.ExpectedOutput') }}
				</h6>
				<div v-html="$md.render(example.output)" class="markdown"></div>

				<hr v-if="example && example.explanation" class="mt-box mb-box" />

				<h6 v-if="example && example.explanation" class="text-heading-5">
					{{ t('Headings.Explanation') }}
				</h6>
				<div
					v-if="example && example.explanation"
					v-html="$md.render(example.explanation)"
					class="markdown"
				></div>
			</div>
		</article>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const examples = computed(() => {
			return props.data?.examples ?? '';
		});

		const router = useRouter();
		const route = useRoute();

		const activeExample = computed(() => {
			return parseInt((route.query?.example ?? '-1').toString());
		});

		const baseQuery = computed(() => {
			return {
				category: route.query?.category ?? '',
				challenge: route.query?.challenge ?? '',
			};
		});

		function toggleShowExample(index: number) {
			router.replace({
				path: route.path,
				query:
					activeExample.value == index
						? {
								...baseQuery.value,
						  }
						: {
								...baseQuery.value,
								example: index,
						  },
			});
		}

		return { t, examples, activeExample, toggleShowExample };
	},
});
</script>

<style scoped></style>
