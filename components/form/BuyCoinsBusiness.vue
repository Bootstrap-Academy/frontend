<template>
	<form class="flex flex-col gap-box" ref="refForm">
		<Input
			:label="t('Inputs.Name')"
			v-model="form.name.value"
			@valid="form.name.valid = $event"
			:rules="form.name.rules"
			light
		/>

		<Input
			:label="t('Inputs.Address')"
			v-model="form.address.value"
			@valid="form.address.valid = $event"
			:rules="form.address.rules"
			light
		/>

		<Input
			:label="t('Inputs.VAT_ID')"
			v-model="form.vatID.value"
			@valid="form.vatID.valid = $event"
			:rules="form.vatID.rules"
			light
		/>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	emits: ['data'],
	setup(props, { emit }) {
		const { t } = useI18n();

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			name: {
				valid: false,
				value: '',
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Name'],
			},
			address: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Address'],
			},
			vatID: {
				value: '',
				valid: false,
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.VAT_ID'],
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
		watch(
			() => form,
			(newValue, oldValue) => {
				if (form.validate()) {
					emit('data', form.body());
				} else {
					emit('data', null);
				}
			},
			{ immediate: true, deep: true }
		);

		return {
			form,
			refForm,
			t,
		};
	},
});
</script>

<style scoped></style>
