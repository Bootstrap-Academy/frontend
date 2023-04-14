<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.Title')"
			v-model="form.title.value"
			@valid="form.title.valid = $event"
			:rules="form.title.rules"
		/>

		<InputSelect
			:label="t('Inputs.Category')"
			id="select-category"
			:options="categoryOptions"
			:model-value="form.category.value"
			@update:model-value="setCategory"
		/>

		<Input
			:label="t('Inputs.StartTime')"
			type="datetime-local"
			v-model="form.start.value"
			@valid="form.start.valid = $event"
			:rules="form.start.rules"
		/>

		<Input
			:label="t('Inputs.EndTime')"
			type="datetime-local"
			v-model="form.end.value"
			@valid="form.end.valid = $event"
			:rules="form.end.rules"
		/>

		<InputList
			:label="t('Inputs.Limits')"
			v-model="form.limits.value"
			@valid="form.limits.valid = $event"
			:rules="form.limits.rules"
			:max="10"
		/>

		<ChallengesInputTasks
			:label="t('Inputs.Tasks')"
			v-model="form.tasks.value"
			@valid="form.tasks.valid = $event"
			:rules="form.tasks.rules"
			:max="10"
		/>

		<ChallengesInputExamples
			:label="t('Inputs.Examples')"
			v-model="form.examples.value"
			@valid="form.examples.valid = $event"
			:rules="form.examples.rules"
			:max="10"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t('Buttons.CreateChallenge') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	setup() {
		const { t } = useI18n();
		const route = useRoute();
		const router = useRouter();

		// ============================================================= Handling Categories
		const challengesCategories = useChallengesCategories();
		const loading = ref(challengesCategories.value.length <= 0);

		const categoryOptions = computed(() => {
			return (challengesCategories.value ?? [])
				.filter((c) => {
					let points = c?.points?.current ?? 0;
					return points >= 100;
				})
				.map((c) => {
					return { label: c.title, value: c.id };
				});
		});

		function setCategory(categoryID: string) {
			router.replace(`/challenges/${categoryID}/create`);
		}

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			title: {
				value: '',
				valid: false,
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Title',
					(v: string) => v.length >= 3 || 'Error.InputMinLength_3',
					(v: string) => v.length <= 32 || 'Error.InputMinLength_32',
				],
			},
			category: {
				value: route?.params?.category ?? '',
				options: [
					{
						label: 'List.Sort.Any',
						value: '---',
					},
					{
						label: 'List.Sort.Latest',
						value: 'latest',
					},
					{
						label: 'List.Sort.Free',
						value: 'free',
					},
				],
			},
			start: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.StartTime'],
			},
			end: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.EndTime'],
			},
			limits: {
				value: [],
				valid: false,
				rules: [],
			},
			tasks: {
				value: [],
				valid: false,
				rules: [],
			},
			examples: {
				value: [],
				valid: false,
				rules: [],
			},
			submitting: false,
			validate: () => {
				let isValid = true;

				for (const key in form) {
					if (
						key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						!form[key].valid
					) {
						isValid = false;
					}
				}

				if (refForm.value) refForm.value.reportValidity();
				return isValid;
			},
			body: () => {
				let obj: any = {};
				for (const key in form) {
					if (key != 'validate' && key != 'body' && key != 'submitting')
						obj[key] = form[key].value;
				}
				return obj;
			},
		});

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;
				const [success, error] = await signup(form.body());
				form.submitting = false;

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		function successHandler(res: any) {
			router.push('/challenges/all');
			setTimeout(() => {
				openSnackbar('success', 'Success.CreatedChallenge');
			}, 1000);
		}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
		}

		// ============================================================= Handling Form State
		watch(
			() => form,
			(newValue, oldValue) => {
				if (!!!localStorage) return;

				localStorage.setItem(
					'form',
					JSON.stringify({
						title: newValue?.title?.value ?? '',
						start: newValue?.start?.value ?? '',
						end: newValue?.end?.value ?? '',
						limits: newValue?.limits?.value ?? [],
						tasks: newValue?.tasks?.value ?? [],
						examples: newValue?.examples?.value ?? [],
					})
				);
			},
			{ deep: true }
		);

		onMounted(async () => {
			if (!!localStorage) {
				const localForm = JSON.parse(localStorage?.getItem('form') ?? '');

				if (!!!localForm) return;

				if (!!localForm.title) form.title.value = localForm.title;
				if (!!localForm.start) form.start.value = localForm.start;
				if (!!localForm.end) form.end.value = localForm.end;
				if (!!localForm.limits) form.limits.value = localForm.limits;
				if (!!localForm.tasks) form.tasks.value = localForm.tasks;
				if (!!localForm.examples) form.examples.value = localForm.examples;
			}

			await getChallengesCategories();
			loading.value = false;
		});

		return {
			form,
			onclickSubmitForm,
			refForm,
			t,
			categoryOptions,
			setCategory,
		};
	},
});
</script>

<style scoped></style>
