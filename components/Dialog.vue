<template>
	<article class="style-card bg-secondary w-full max-w-3xl">
		<div class="card grid gap-x-4 md:gap-x-6 grid-cols-[auto_1fr]">
			<component
				class="h-10 w-10 row-span-2 md:row-span-3"
				:class="[theme.fill]"
				:is="theme.icon"
			></component>

			<h6 class="text-heading-2 text-heading font-heading">
				{{ t(heading) }}
			</h6>

			<p class="text-body-1 text-body font-body m-0 mt-box">
				{{ t(body) }}
			</p>

			<div class="col-span-2 md:col-span-1">
				<slot name="content" :t="t" />
			</div>
		</div>

		<div class="card flex gap-card justify-end bg-[#1c3250]">
			<Btn
				v-if="!!secondaryBtn.label"
				:bgColor="theme.bg"
				:borderColor="theme.border"
				secondary
				@click="
					secondaryBtn.onclick();
					closeDialog();
				"
			>
				{{ t(secondaryBtn.label) }}
			</Btn>
			<Btn
				v-if="!!primaryBtn.label"
				:bgColor="theme.bg"
				:borderColor="theme.border"
				@click="
					primaryBtn.onclick();
					closeDialog();
				"
			>
				{{ t(primaryBtn.label) }}
			</Btn>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		dialog: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const type = computed(() => {
			return props.dialog?.type ?? 'info';
		});

		const theme = computed(() => {
			return getTheme(type.value);
		});

		const heading = computed(() => {
			return props.dialog?.heading ?? '';
		});

		const body = computed(() => {
			return props.dialog?.body ?? '';
		});

		const primaryBtn = computed(() => {
			return {
				label: props.dialog?.primaryBtn?.label ?? '',
				onclick: props.dialog.primaryBtn.onclick,
			};
		});

		const secondaryBtn = computed(() => {
			return {
				label: props.dialog?.secondaryBtn?.label ?? '',
				onclick: props.dialog.secondaryBtn.onclick,
			};
		});

		return {
			t,
			theme,
			heading,
			body,
			primaryBtn,
			secondaryBtn,
		};
	},
});
</script>

<style scoped></style>
