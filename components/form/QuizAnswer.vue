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

		<article
			class="grid grid-cols-1 gap-card-sm overflow-scroll h-[45vh] place-content-start"
		>
			<button
				v-for="option of data?.options ?? []"
				:key="option.answer"
				@click="selected = option.answer"
				type="button"
				class="box style-box border-4 border-tertiary text-heading h-fit"
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
				@click="onclickSubmitForm()"
				mt
			>
				{{ t('Buttons.SubmitAnswer') }}
			</InputBtn>

			<div v-if="answer" class="flex gap-4 items-center mt-8">
				<button
					type="button"
					class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
				>
					👍
				</button>
				<button
					type="button"
					class="w-10 h-10 pt-1 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
				>
					👎
				</button>
				<button
					type="button"
					class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
				>
					😐
				</button>
				<button
					type="button"
					class="w-10 h-10 pl-2 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
				>
					🚩
				</button>
			</div>
			<InputBtn
				v-if="answer"
				:loading="loading"
				class="self-center"
				@click="onclickSubmitForm()"
				mt
			>
				{{ t('Buttons.Continue') }}
			</InputBtn>
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
