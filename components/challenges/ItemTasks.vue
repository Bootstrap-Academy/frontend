<template>
	<article>
		<h4 class="text-heading-3">{{ t('Headings.Tasks') }}</h4>
		<div class="border border-primary rounded-md overflow-hidden mt-3">
			<table class="min-w-full leading-normal">
				<tr>
					<th
						class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
					>
						{{ t('Headings.Name') }}
					</th>
					<th
						class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
					>
						{{ t('Headings.Description') }}
					</th>
					<th
						class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
					>
						{{ t('Headings.Score') }}
					</th>
					<th
						class="px-5 py-3 border-b-2 border-primary bg-primary text-left text-sm font-semibold text-heading font-body uppercase tracking-widest"
					>
						{{ t('Headings.Attempts') }}
					</th>
				</tr>

				<tr v-for="task of tasks" :key="task.name">
					<td
						class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
					>
						{{ task.name }}
					</td>
					<td
						class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
					>
						<div class="w-fit" v-html="$md.render(task.description)"></div>
					</td>
					<td
						class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
					>
						{{ task.score?.current ?? 0 }} / {{ task.score?.total ?? 0 }}
					</td>
					<td
						class="px-5 py-3 border-b border-r border-primary text-body-1 text-body font-body"
					>
						{{ task.attempts }}
					</td>
				</tr>
			</table>
		</div>
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

		const tasks = computed(() => {
			return props.data?.tasks ?? '';
		});

		return { t, tasks };
	},
});
</script>

<style scoped></style>
