<template>
	<form class="flex flex-col gap-box" ref="refForm">
		<Input
			:class="{
				'pointer-events-none': user && user.country,
			}"
			:label="t('Inputs.Country')"
			v-model="form.country.value"
			@valid="form.country.valid = $event"
			:rules="form.country.rules"
			light
		/>

		<Input
			:class="{
				'pointer-events-none': user && user.email,
			}"
			:label="t('Inputs.EmailAddress')"
			v-model="form.email.value"
			@valid="form.email.valid = $event"
			:rules="form.email.rules"
			light
		/>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IForm } from '~/types/form';

export default defineComponent({
  emits: ['data'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const user: Ref<any> = useUser();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      country: {
        valid: user.value?.country ?? '',
        value: '',
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Country'],
      },
      email: {
        value: user.value?.email ?? '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.EmailAddress',
          (v: string) => /.+@.+\..+/.test(v) || 'Error.InputEmailForm',
        ],
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

    watch(
      () => user.value,
      (newValue, oldValue) => {
        if (!!!newValue) return;

        form.country.value = newValue.country
          ? newValue.country
          : form.country.value;

        form.email.value = newValue.email ? newValue.email : form.email.value;
      },
      { immediate: true, deep: true }
    );

    return {
      form,
      refForm,
      t,
      user,
    };
  },
});
</script>

<style scoped></style>
