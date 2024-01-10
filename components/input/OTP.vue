<template>
	<article>
		<label for="" class="text-subheading text-body-2 font-body mb-4 block">
			{{ t(label) }}
		</label>
		<div class="flex gap-3">
			<template v-for="i in numberOfFields" :key="i">
				<input
					:maxlength="numberOfCharsPerField"
					ref="DOM_INPUTS"
					type="number"
					class="block tracking-[0.15em] flex-shrink-0 max-w-fit min-w-[35px] py-1 md:min-w-[45px] md:px-4 md:py-2.5 text-base text-white bg-secondary rounded relative z-10 transition ease-out duration-500 focus:outline-none appearance-none ring-2 ring-tertiary focus:ring-offset-2 focus:ring-offset-tertiary focus:ring-accent text-center"
					:style="{ width: width }"
					@input="oninput(i - 1)"
					@keydown.delete="onkeydownDelete(i - 1)"
				/>

				<div v-if="i % breakAfterHowManyFields == 0" class="w-2"></div>
			</template>
		</div>
		<p
			class="pt-2 text-xs relative z-0 transition ease-out duration-500 text-error"
			:class="
				error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'
			"
		>
			{{ error }}.
		</p>
	</article>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    numberOfFields: { type: Number, default: 6 },
    numberOfCharsPerField: { type: Number, default: 1 },
    breakAfterHowManyFields: { type: Number, default: 3 },
    label: { type: String, default: '' },
    type: { type: String, default: 'number' },
    modelValue: { type: String, default: '' },
    rules: { type: Array, default: [] },
  },
  emits: ['update:modelValue', 'valid'],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= computed
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit('update:modelValue', value);
      },
    });

    // ============================================================= refs
    const touched = ref(!!props.modelValue);
    const DOM_INPUTS = ref<HTMLInputElement[] | []>([]);

    const totalOTPChars = computed(() => {
      return props.numberOfFields * props.numberOfCharsPerField;
    });
    // ============================================================= functions
    function onblur() {
      touched.value = true;
    }

    function oninput(index: number) {
      let value = DOM_INPUTS.value[index].value;

      if (
        value.length >= props.numberOfCharsPerField * props.numberOfFields &&
				index >= props.numberOfFields
      ) {
        DOM_INPUTS.value[index].value = value[0];
      }

      let otp = '';
      DOM_INPUTS.value.forEach((input) => {
        otp = otp + input.value;
      });

      let finalOTP = '';

      for (let i = 0; i < otp.length; i++) {
        if (!!otp[i] && !!DOM_INPUTS.value[i]) {
          DOM_INPUTS.value[i].value = otp[i];
          finalOTP = finalOTP + otp[i];
          DOM_INPUTS.value[i].focus();
        }
      }

      emit('update:modelValue', finalOTP);

      let msg: string = '';

      props.rules
        .slice()
        .reverse()
        .forEach((rule: any) => {
          if (rule(finalOTP) != true) {
            const [string, placeholder] = rule(finalOTP).split('_');

            if (!!placeholder) {
              msg = t(string, {
                placeholder: t(placeholder),
              });
            } else if (!!string) {
              msg = t(string);
            } else {
              msg = t(rule(finalOTP));
            }
          }
        });

      DOM_INPUTS.value[0].setCustomValidity(msg);
      emit('valid', !!!msg);
      error.value = msg;
    }

    function onkeydownDelete(index: number) {
      let value = DOM_INPUTS.value[index].value;

      if (!!!value && index > 0) {
        DOM_INPUTS.value[index].focus();
      }
    }

    const width = computed(() => {
      return `${21 * props.numberOfCharsPerField}px`;
    });

    const error = ref('');

    onMounted(() => {
      nextTick(() => {
        if (!!DOM_INPUTS.value[0]) DOM_INPUTS.value[0].focus();
      });
    });

    return {
      input,
      error,
      touched,
      onblur,
      DOM_INPUTS,
      t,
      oninput,
      onkeydownDelete,
      width,
    };
  },
});
</script>

<style scoped></style>
