<template>
	<main class="container pt-container pb-container flex justify-center">
		<div class="container-form max-w-4xl">
			<form
				class="flex flex-col gap-box"
				:class="{ 'form-submitting': form.submitting }"
				@submit.prevent="onclickSubmitForm"
				ref="refForm"
			>
				<InputTime />
				
				<InputMedia
					class="mx-auto"
					id="image"
					rounded
					v-model="form.image.url"
					@file="form.image.value = $event"
					@valid="form.image.valid = $event"
				>
					<template #hint="{ t }">
						{{ t('Links.GravatarImage') }}
						<a
							href="https://de.gravatar.com/"
							target="_blank"
							class="cursor-pointer"
						>
							gravatar.com
						</a>
					</template>
				</InputMedia>

				<InputMedia
					label="Inputs.CourseVideo"
					class="mx-auto"
					id="video"
					video
					v-model="form.video.url"
					@file="form.video.value = $event"
					@valid="form.video.valid = $event"
				/>

				<Input
					label="Inputs.Name"
					v-model="form.name.value"
					@valid="form.name.valid = $event"
					:rules="form.name.rules"
				/>
				<Input
					label="Inputs.EmailAddress"
					type="email"
					v-model="form.email.value"
					@valid="form.email.valid = $event"
					:rules="form.email.rules"
				/>
				<Input
					label="Inputs.Password"
					type="password"
					v-model="form.password.value"
					@valid="form.password.valid = $event"
					:rules="form.password.rules"
				/>
				<InputTextarea
					label="Inputs.About"
					v-model="form.about.value"
					@valid="form.about.valid = $event"
					:rules="form.about.rules"
					:max="100"
				/>

				<InputTags
					label="Inputs.Tags"
					v-model="form.tags.value"
					@valid="form.tags.valid = $event"
					:rules="form.tags.rules"
				/>

				<InputRange
					:min="form.salary.min"
					:max="form.salary.max"
					:reduce="0"
					sm
					v-model="form.salary.value"
				/>

				<InputSwitch label="Inputs.Remote" v-model="form.remote.value" />

				<InputSelect
					id="select_1"
					:options="form.sort.options"
					btn-type
					v-model="form.sort.value"
				/>

				<InputSelect
					id="select_2"
					:options="form.sort.options"
					v-model="form.sort.value"
				/>
				<InputSelect
					id="select_3"
					sm
					:options="form.sort.options"
					btn-type
					v-model="form.sort.value"
				/>

				<InputSelect
					id="select_4"
					sm
					:options="form.sort.options"
					v-model="form.sort.value"
				/>

				<InputOTP
					label="Inputs.MFACode"
					v-model="form.mfa_code.value"
					@valid="form.mfa_code.valid = $event"
					:rules="form.mfa_code.rules"
				/>

				<InputRadioGroup
					classesForCheckbox="mt-card"
					name="professionalLevel"
					v-model="form.salaryUnit.value"
					:options="form.salaryUnit.options"
				/>

				<InputCheckboxGroup
					sm
					classesForCheckbox="mt-card"
					name="professionalLevel"
					v-model="form.jobType.value"
					:options="form.jobType.options"
				/>

				<InputCheckbox
					label="Links.IAgreeTo"
					id="TermsAndConditions"
					:link="{
						to: '/docs/terms-and-conditions',
						label: 'Links.TermsAndConditions',
					}"
					target="_blank"
					required
					v-model="form.termsAndConditions.value"
					@valid="form.termsAndConditions.valid = $event"
				/>
				<InputBtn @click="onclickSubmitForm" :loading="form.submitting">
					Submit Form
				</InputBtn>
			</form>
		</div>
	</main>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'Form',
  },
  setup() {
    const refForm = ref<HTMLFormElement | null>(null);
    const refInputs = ref([]);

    const form: any = reactive({
      image: {
        valid: false,
        value: '',
        url: '',
      },
      video: {
        valid: false,
        value: '',
        url: '',
      },
      name: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Name',
          (v: string) => v.length >= 2 || 'Error.InputMinLength_2',
          (v: string) => v.length <= 256 || 'Error.InputMaxLength_256',
        ],
      },
      email: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.EmailAddress',
          (v: string) => /.+@.+\..+/.test(v) || 'Error.InputEmailForm',
        ],
      },
      password: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.Password',
          (v: string) => v.length >= 10 || 'Error.InputMinLength_10',
        ],
      },
      about: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.About',
          (v: string) => v.length <= 100 || 'Error.InputMaxLength_100',
        ],
      },
      tags: {
        value: [],
        valid: true,
        rules: [
          (v: string) =>
            !v || form.tags.value.length < 5 || 'Error.InputMaxTags_5',
        ],
      },
      remote: {
        value: false,
        rules: [(v: boolean) => !!v || 'Error.InputEmpty_Inputs.Remote'],
      },
      salary: {
        min: 0,
        max: 9000,
        value: 4000,
      },
      mfa_code: {
        value: '',
        valid: false,
        rules: [
          (v: string) => !!v || 'Error.InputEmpty_Inputs.MFACode',
          (v: string) => v.length >= 6 || 'Error.InputMinLength_6',
        ],
      },
      jobType: {
        value: ['full_time', 'part_time'],
        options: [
          {
            value: 'full_time',
            label: 'List.Filter.FullTime',
          },
          {
            value: 'internship',
            label: 'List.Filter.Internship',
          },
          {
            value: 'part_time',
            label: 'List.Filter.PartTime',
          },
          {
            value: 'temporary',
            label: 'List.Filter.Temporary',
          },
          {
            value: 'mini_job',
            label: 'List.Filter.MiniJob',
          },
        ],
      },
      salaryUnit: {
        value: 'morphcoins',
        options: [
          {
            label: 'List.Filter.Any',
            value: '---',
          },
          {
            label: 'List.Filter.Morphcoins',
            value: 'morphcoins',
          },
          {
            label: 'List.Filter.Euros',
            value: 'euros',
          },
        ],
      },
      sort: {
        value: 'latest',
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
      termsAndConditions: {
        value: false,
        valid: false,
      },
      submitting: false,
      validate: () => {
        let isValid = true;

        for (const key in form) {
          if (
            key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						key != 'termsAndConditions' &&
						form[key].valid == false
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
          if (
            key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						key != 'termsAndConditions'
          )
            obj[key] = form[key].value;
        }
        return obj;
      },
    });

    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        setTimeout(() => {
          form.submitting = false;
        }, 3000);
      }
    }

    return { refInputs, refForm, form, onclickSubmitForm };
  },
};
</script>
