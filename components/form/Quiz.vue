<template>
	<form
		class="flex flex-col gap-box"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.Question')"
			v-model="form.question.value"
			@valid="form.question.valid = $event"
			:rules="form.question.rules"
		/>
		<div class="flex items-center gap-card">
			<label class="text-body-2 text-body font-body block mb-2">
				{{ t('Inputs.Payed') }}
			</label>
			<InputSwitch v-model="form.payed.value" />
		</div>

		<article class="flex flex-wrap gap-card">
			<button
				type="button"
				v-for="questionType of questionTypes"
				:key="questionType.value"
				@click="onclickSetQuestionType(questionType.value)"
				class="w-40 h-20 border-2 border-info style-card"
				:class="
					selectedQuestionType == questionType.value
						? 'text-white bg-info'
						: 'text-white'
				"
			>
				{{ t(questionType.label) }}
			</button>
		</article>

		<Btn @click="onclickAddOption" class="w-fit self-end">Add Option</Btn>
		<article
			class="flex gap-card items-center"
			v-for="(option, i) of options"
			:key="option?.id ?? i"
		>
			<Input
				:label="t('Inputs.Option')"
				v-model="option.answer"
				@valid="option.valid = $event"
				:rules="option.rules"
				class="w-full"
			/>
			<div>
				<label class="text-body-2 text-body font-body block mb-2">
					{{ t('Inputs.Correct') }}
				</label>
				<InputSwitch
					:model-value="option.correct"
					@update:model-value="setOptionCorrect($event, i)"
				/>
			</div>

			<Icon
				:icon="XMarkIcon"
				class="cursor-pointer"
				@click="onclickRemoveOption(i)"
			/>
		</article>

		<Input
			:label="t('Inputs.Skill')"
			v-model="form.skill.value"
			@valid="form.skill.valid = $event"
			:rules="form.skill.rules"
		/>
		<Input
			:label="t('Inputs.SubSkill')"
			v-model="form.subSkill.value"
			@valid="form.subSkill.valid = $event"
			:rules="form.subSkill.rules"
		/>
		<Input
			:label="t('Inputs.Course')"
			v-model="form.course.value"
			@valid="form.course.valid = $event"
			:rules="form.course.rules"
		/>
		<Input
			:label="t('Inputs.Section')"
			v-model="form.section.value"
			@valid="form.section.valid = $event"
			:rules="form.section.rules"
		/>
		<Input
			:label="t('Inputs.Lecture')"
			v-model="form.lecture.value"
			@valid="form.lecture.valid = $event"
			:rules="form.lecture.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-center"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t('Buttons.CreateQuiz') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';
import { XMarkIcon } from '@heroicons/vue/24/solid';

export default defineComponent({
	components: { XMarkIcon },
	props: { data: Object as PropType<any>, default: null },
	setup(props) {
		const { t } = useI18n();

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			question: {
				valid: false,
				value: '',
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Question'],
			},
			payed: {
				valid: true,
				value: 0,
				rules: [],
			},
			skill: {
				valid: false,
				value: '',
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Skill'],
			},
			subSkill: {
				valid: false,
				value: '',
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.SubSkill'],
			},
			course: {
				valid: true,
				value: '',
				rules: [],
			},
			section: {
				valid: true,
				value: '',
				rules: [],
			},
			lecture: {
				valid: true,
				value: '',
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

				options.forEach((option) => {
					if (option.valid == false) isValid = false;
				});

				if (refForm.value) refForm.value.reportValidity();
				return isValid;
			},
			body: () => {
				let obj: any = {};
				for (const key in form) {
					if (key != 'validate' && key != 'body' && key != 'submitting')
						obj[key] = form[key].value;
				}

				let mappedOptions = options.map((option) => {
					return {
						answer: option.answer,
						correct: option.correct,
						id: `Option-${getRandomNumber(0, 32432424324)}-${Date.now()}`,
					};
				});
				return { ...obj, options: mappedOptions };
			},
		});

		// ============================================================= options
		const options: any[] = reactive([]);

		function onclickAddOption() {
			let isAllowed = true;
			if (options.length > 0) {
				let lastAddedOption = options[options.length - 1].answer;
				if (!!!lastAddedOption) isAllowed = false;
			}

			if (!isAllowed) {
				openSnackbar(
					'error',
					'Please fill current option first before adding new option.'
				);
				return;
			}

			options.push({
				answer: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Option'],
				correct: false,
			});
		}

		function onclickRemoveOption(index: number) {
			options.splice(index, 1);
		}

		function setOptionCorrect(status: boolean, index: number) {
			if (selectedQuestionType.value == 'Multi Choice' || status == false) {
				options.splice(index, 1, { ...options[index], correct: status });
				return;
			}

			let arr = options;

			arr = arr.map((o, i) => {
				return i == index ? { ...o, correct: true } : { ...o, correct: false };
			});

			arr.forEach((o) => {
				options.pop();
			});

			arr.forEach((o) => {
				options.push(o);
			});
		}

		const questionTypes = [
			{
				label: 'Headings.MultiChoice',
				value: 'Multi Choice',
			},
			{
				label: 'Headings.SingleChoice',
				value: 'Single Choice',
			},
		];
		const selectedQuestionType = ref('Multi Choice');

		function onclickSetQuestionType(type: string) {
			selectedQuestionType.value = type;
			if (type == 'Multi Choice') return;
			if (options.length <= 0) return;

			let listOfCorrectOptionIndex = [];

			options.forEach((option, index) => {
				if (option.correct == true) {
					listOfCorrectOptionIndex.push(index);
				}
			});

			if (listOfCorrectOptionIndex.length <= 1) return;

			for (let i = 1; i < listOfCorrectOptionIndex.length; i++) {
				options.splice(i, 1, { ...options[i], correct: false });
			}
		}
		// ============================================================= ids
		const route = useRoute();

		watch(
			() => route,
			(newValue, oldValue) => {
				setFormData({
					skill: (newValue.params?.skill ?? '').toString(),
					subSkill: (newValue.params?.subSkill ?? '').toString(),
					course: (newValue.query?.course ?? '').toString(),
					section: (newValue.query?.section ?? '').toString(),
					lecture: (newValue.query?.lecture ?? '').toString(),
					question: '',
					options: [],
				});
			},
			{ immediate: true, deep: true }
		);

		watch(
			() => props.data,
			(newValue, oldValue) => {
				setFormData(newValue);
			},
			{ immediate: true, deep: true }
		);

		function setFormData(data: any) {
			if (!!!data) return;

			form.question.value = data.question ?? '';
			form.question.valid = !!form.question.value;

			let arr = data.options ?? [];

			if (arr.length > 0) {
				arr = arr.map((option: any) => {
					return {
						answer: option.answer,
						valid: !!option.answer,
						rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Option'],
						correct: option.correct,
					};
				});
			}

			Object.assign(options, [...arr]);

			form.skill.value = data.skill ?? '';
			form.skill.valid = !!form.skill.value;

			form.subSkill.value = data.subSkill ?? '';
			form.subSkill.valid = !!form.subSkill.value;

			form.course.value = data.course ?? '';
			form.section.value = data.section ?? '';
			form.lecture.value = data.lecture ?? '';
		}

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				if (options.length <= 0) {
					openSnackbar('error', 'Error.AddQuizQuestionOptions');
					return;
				}
				form.submitting = true;
				const [success, error] = await createQuiz(form.body());
				form.submitting = false;

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		function successHandler(res: any) {
			openSnackbar('success', 'Success.CreatedQuiz');
		}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
		}

		return {
			form,
			onclickSubmitForm,
			refForm,
			t,
			onclickAddOption,
			options,
			XMarkIcon,
			onclickRemoveOption,
			questionTypes,
			selectedQuestionType,
			onclickSetQuestionType,
			setOptionCorrect,
		};
	},
});
</script>

<style scoped></style>
