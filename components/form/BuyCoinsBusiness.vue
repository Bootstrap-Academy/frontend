<template>
	<form class="flex flex-col gap-box" ref="refForm">
		<Input
			:label="t('Inputs.Name')"
			v-model="form.name.value"
			@valid="form.name.valid = $event"
			:rules="form.name.rules"
			light
		/>

		<h3 class="text-black text-heading-3">{{ t('Inputs.Address') }}</h3>
		<Input
			:label="t('Inputs.AddressPrename')"
			v-model="form.addressPrename.value"
			@valid="form.addressPrename.valid = $event"
			:rules="form.addressPrename.rules"
			light
		/>
		<Input
			:label="t('Inputs.AddressName')"
			v-model="form.addressName.value"
			@valid="form.addressName.valid = $event"
			:rules="form.addressName.rules"
			light
		/>
		<Input
			:label="t('Inputs.AddressStreet')"
			v-model="form.addressStreet.value"
			@valid="form.addressStreet.valid = $event"
			:rules="form.addressStreet.rules"
			light
		/>
		<Input
			:label="t('Inputs.AddressPLZ')"
			v-model="form.addressPLZ.value"
			@valid="form.addressPLZ.valid = $event"
			:rules="form.addressPLZ.rules"
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
import type { IForm } from '~/types/form';

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
      addressPrename: {
        value: '',
        valid: false,
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.AddressPrename'],
      },
      addressName: {
        value: '',
        valid: false,
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.AddressName'],
      },
      addressStreet: {
        value: '',
        valid: false,
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.AddressStreet'],
      },
      addressPLZ: {
        value: '',
        valid: false,
        rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.AddressPLZ'],
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
