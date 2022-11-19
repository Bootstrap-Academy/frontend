<template>
	<Transition name="slide-up">
		<div
			class="card fixed z-50 bottom-[85px] right-0 flex justify-end"
			v-if="show"
		>
			<div class="bg-secondary">
				<article
					class="border-t-4 rounded-b p-4 md:p-6 shadow-lg grid gap-x-4 md:gap-x-6 grid-cols-[auto_1fr]"
					role="alert"
					:class="[theme.bgLight, theme.border]"
				>
					<component
						class="h-8 w-8 row-span-2"
						:class="[theme.fill]"
						:is="theme.icon"
					></component>

					<h6
						class="text-heading-4 text-heading font-heading"
						:class="{ 'mt-1': !!!body }"
					>
						{{ t(heading) }}
					</h6>
					<p class="text-body-1 text-body font-body m-0">
						{{ t(body) }}
					</p>
				</article>
			</div>
		</div>
	</Transition>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent } from 'vue';

export default defineComponent({
	setup() {
		const { t } = useI18n();

		const snackbar = useSnackbar();

		const show = computed(() => {
			return snackbar.value?.show ?? false;
		});

		const type = computed(() => {
			return snackbar.value?.type ?? 'info';
		});

		const theme = computed(() => {
			return getTheme(type.value);
		});

		const heading = computed(() => {
			return snackbar.value?.heading ?? '';
		});

		const body = computed(() => {
			return snackbar.value?.body ?? '';
		});

		return { t, theme, heading, body, show };
	},
});
</script>

<style scoped></style>
