<template>
	<form
		class="flex flex-col justify-between gap-box relative card h-[96%]"
		:class="{ 'form-submitting': loading }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<img
			class="w-full h-60 object-cover style-card"
			src="https://placehold.co/450x400/webp"
			alt=""
		/>
		<h4 class="text-heading-3">Q). {{ data?.question ?? '' }}</h4>

		<article class="grid grid-cols-1 gap-card-sm">
			<button
				v-for="option of data?.options ?? []"
				:key="option.answer"
				@click="selected = option.answer"
				type="button"
				class="box style-box border-4 border-tertiary text-heading"
				:class="{
					'bg-success text-primary':
						option.correct == true && answer == option.answer,
					'bg-error': option.correct == false && answer == option.answer,
					'bg-warning': selected == option.answer,
				}"
			>
				{{ option.answer }}
			</button>
		</article>

		<article
			class="flex justify-between gap-card items-center sticky bottom-card right-card"
		>
			<InputBtn
				v-if="!!!answer"
				:loading="loading"
				class="self-center"
				@click="onclickSubmitForm()"
				mt
			>
				{{ t('Buttons.SubmitAnswer') }}
			</InputBtn>

			<template v-else>
				<div class="flex gap-4 h-full items-center">
					<button type="button" class="text-heading-3 py-1 px-2">👍</button>
					<button type="button" class="text-heading-3 py-1 px-2">👎</button>
					<button type="button" class="text-heading-3 py-1 px-2">😐</button>
					<button type="button" class="text-heading-3 py-1 px-2">🚩</button>
				</div>
				<InputBtn
					:loading="loading"
					class="self-center"
					@click="onclickSubmitForm()"
					mt
				>
					{{ t('Buttons.Continue') }}
				</InputBtn>
			</template>
		</article>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup() {
		const { t } = useI18n();

		const loading = ref(false);
		const selected = ref('');
		const answer = ref('');

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= Checks
		const router = useRouter();
		const route = useRoute();

		async function onclickSubmitForm() {
			loading.value = true;
			await sleep(3000);
			loading.value = false;
			answer.value = selected.value;
			selected.value = '';
		}

		function successHandler(res: any) {}

		function errorHandler(res: any) {}

		return {
			onclickSubmitForm,
			refForm,
			t,
			loading,
			answer,
			selected,
		};
	},
});
</script>

<style scoped></style>
