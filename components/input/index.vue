<template>
	<div>
		<div class="flex flex-wrap gap-card-sm items-center">
			<label
				v-if="!noLabel"
				class="text-body-2 text-body font-body block mb-2"
				:for="id ?? label"
			>
				{{ t(label) }}
			</label>
			<p
				v-if="hint"
				class="pb-2 text-xs text-body relative z-0"
				:class="noLabel ? 'text-left' : 'text-right'"
			>
				{{ t(hint) }}
			</p>
		</div>
		<input
			class="block w-full px-4 py-3 text-base text-white bg-secondary rounded-md relative z-10 transition ease-out duration-500 focus:outline-none appearance-none ring-2 ring-tertiary focus:ring-offset-2 focus:ring-offset-tertiary focus:ring-accent"
			:class="{
				'invalid:ring-error valid:ring-accent': (touched && input) || error,
			}"
			ref="DOM_INPUT"
			:placeholder="noLabel ? t(label) : t(placeholder)"
			:type="type"
			:name="name != '' ? name : label"
			:id="id != '' ? id : label"
			v-model="input"
			@blur="touched = true"
			:autocomplete="autocomplete"
		/>

		<p
			class="pt-2 text-xs relative z-0 transition ease-out duration-500 text-error"
			:class="
				error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'
			"
		>
			{{ error }}.
		</p>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		autocomplete: { type: String, default: 'true' },
		hint: { type: String, default: '' },
		name: { type: String, default: '' },
		id: { type: String, default: '' },
		type: { type: String, default: 'text' },
		label: { type: String, default: '' },
		noLabel: { type: Boolean, default: false },
		noTrim: { type: Boolean, default: false },
		placeholder: { type: String, default: '' },
		rules: { type: Array, default: [] },
		modelValue: { type: String, default: '' },
	},
	emits: ['update:modelValue', 'valid'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const input = computed({
			get() {
				return props.modelValue;
			},
			set(value: string) {
				emit(
					'update:modelValue',
					props.noTrim || props.type == 'password' ? value : value.trim()
				);
			},
		});

		const touched = ref(!!props.modelValue);

		const DOM_INPUT = ref<HTMLInputElement | null>(null);

		const error = computed(() => {
			if (!!!DOM_INPUT.value || (!touched.value && !input.value)) return '';

			let msg: string = '';

			props.rules
				.slice()
				.reverse()
				.forEach((rule: any) => {
					if (rule(input.value) != true) {
						const [string, placeholder] = rule(input.value).split('_');

						if (!!placeholder) {
							msg = t(string, {
								placeholder: t(placeholder),
							});
						} else if (!!string) {
							msg = t(string);
						} else {
							msg = t(rule(input.value));
						}
					}
				});

			DOM_INPUT.value.setCustomValidity(msg);
			emit('valid', !!!msg);

			return msg;
		});

		return { t, input, error, DOM_INPUT, touched };
	},
});
</script>

<style scoped></style>
