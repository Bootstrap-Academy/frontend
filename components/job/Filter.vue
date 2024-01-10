<template>
	<aside class="card lg:p-0">
		<!--  max-h-[87.5vh] overflow-y-scroll -->
		<header
			class="flex gap-box justify-between items-center h-fit border-b border-[#a1a1a122] pb-box mr-[25px] mb-card"
		>
			<h2 class="text-heading-3">{{ t('Headings.FilterBy') }}</h2>
			<Btn tertiary sm @click="reset" class="mr-0 pr-0">
				<span class="text-accent">{{ t('Buttons.Reset') }}</span>
			</Btn>
		</header>

		<form class="grid gap-container mr-5 h-fit" ref="refForm">
			<article>
				<h3 class="filter-heading">
					{{ t('Headings.JobType') }}
				</h3>
				<InputCheckboxGroup
					ref="refType"
					sm
					class="ml-6"
					name="type"
					v-model="form.type.value"
					:options="form.type.options"
				/>
			</article>

			<article>
				<h3 class="filter-heading">
					{{ t('Headings.Salary') }}
				</h3>
				<InputRange
					class="-mt-6 ml-6"
					:min="form.salary_min.min"
					:max="jobMaxSalary"
					:reduce="0"
					sm
					v-model="form.salary_min.value"
				/>
			</article>

			<article>
				<h3 class="filter-heading">
					{{ t('Headings.SalaryUnit') }}
				</h3>

				<InputRadioGroup
					class="ml-6"
					sm
					name="salary_unit"
					v-model="form.salary_unit.value"
					:options="form.salary_unit.options"
				/>
			</article>

			<article>
				<h3 class="filter-heading mb-box">
					{{ t('Headings.RemoteOnly') }}
				</h3>
				<InputSwitch class="ml-6" v-model="form.remote.value" />
			</article>

			<article>
				<h3 class="filter-heading">
					{{ t('Headings.ProfessionalLevel') }}
				</h3>
				<InputCheckboxGroup
					class="ml-6"
					sm
					ref="refProfessionalLevel"
					name="professional_level"
					v-model="form.professional_level.value"
					:options="form.professional_level.options"
				/>
			</article>
		</form>
	</aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    filters: { type: Object as PropType<any>, default: null },
  },
  emits: ['filters'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const jobMaxSalary = useJobMaxSalary();

    const refForm = ref<HTMLFormElement | null>(null);

    const form: any = reactive({
      salary_min: {
        min: 0,
        max: 10000,
        value: props.filters?.salary_min ?? 0,
      },
      salary_unit: {
        value: props.filters?.salary_unit ?? '---',
        options: [
          {
            label: 'List.Filter.Any',
            value: '---',
          },
          {
            label: 'List.Filter.Morphcoins',
            value: 'MC',
            tooltip: 'Body.MorphcoinsToolTip',
          },
          {
            label: 'List.Filter.Euros',
            value: 'EUR',
          },
        ],
      },
      remote: {
        value: props.filters?.remote ?? false,
        rules: [(v: boolean) => !!v || 'Error.InputEmpty_Inputs.Remote'],
      },
      type: {
        value: props.filters?.type ?? [],
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
      professional_level: {
        value: props.filters?.professional_level ?? [],
        options: [
          {
            value: 'entry',
            label: 'List.Filter.Entry',
          },
          {
            value: 'junior',
            label: 'List.Filter.Junior',
          },
          {
            value: 'senior',
            label: 'List.Filter.Senior',
          },
          {
            value: 'manager',
            label: 'List.Filter.Manager',
          },
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
          if (key != 'validate' && key != 'body' && key != 'submitting')
            obj[key] = form[key].value;
        }
        return obj;
      },
    });

    watch(
      () => form,
      async (newValue, oldValue) => {
        emit('filters', form.body());
      },
      { deep: true }
    );

    const refType = ref();
    const refProfessionalLevel = ref();
    function reset() {
      form.salary_min.value = 0;
      form.salary_unit.value = '---';
      form.remote.value = false;

      form.type.value = [];
      refType.value.reset();

      form.professional_level.value = [];
      refProfessionalLevel.value.reset();
    }

    return { t, reset, form, refType, refProfessionalLevel, jobMaxSalary };
  },
});
</script>

<style scoped>
.filter-heading {
	@apply text-subheading text-body-2 font-body mb-card-sm;
}

aside::-webkit-scrollbar {
	width: 5px;
}
aside::-webkit-scrollbar-thumb {
	background: var(--color-transparent);
}
aside:hover::-webkit-scrollbar-thumb {
	background: var(--color-tertiary);
	opacity: 0.6;
	border-radius: 20px;
}
aside:hover {
	-ms-overflow-style: var(--color-tertiary) !important;
	scrollbar-width: 5px !important;
	scrollbar-color: var(--color-tertiary);
}
</style>
