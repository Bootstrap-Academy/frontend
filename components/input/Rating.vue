<template>
	<article>
		<label
			v-if="label"
			class="text-body text-body-2 font-body mb-2 md:mb-1 block"
		>
			{{ t(label) }}
		</label>
		<article class="flex gap-2 relative z-3">
			<StarIcon
				v-for="n in 5"
				:key="n"
				class="flex-shrink-0 w-6 h-6 md:w-10 md:h-10 cursor-pointer"
				:class="[n <= input ? theme.text : 'text-subheading']"
				@click="input = n"
			/>
		</article>

		<p
			class="pt-2 text-xs relative z-0 transition ease-out duration-500 text-error"
			:class="error ? 'opacity-100' : 'opacity-0'"
		>
			{{ error }}.
		</p>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { StarIcon } from '@heroicons/vue/24/solid';

export default defineComponent({
  props: {
    label: { type: String, default: '' },
    modelValue: { type: Number, default: 1 },
  },
  components: { StarIcon },
  emits: ['update:modelValue', 'valid'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value: number) {
        emit('update:modelValue', value);
      },
    });
    // ============================================================= computed

    const error = computed(() => {
      let msg: string = '';

      if (input.value < 0) {
        msg = t('Error.WebinarRating');
      }

      emit('valid', !!!msg);

      return msg;
    });

    const type = computed(() => {
      if (input.value > 4) return 'success';
      else if (input.value > 2 && input.value <= 4) return 'info';
      else return 'error';
    });

    const theme = computed(() => {
      if (type.value == 'success') {
        return {
          bg: 'bg-success',
          bgLight: 'bg-success-light',
          fill: 'fill-success',
          stroke: 'stroke-success',
          border: 'border-success',
          text: 'text-success',
        };
      } else if (type.value == 'error') {
        return {
          bg: 'bg-error',
          bgLight: 'bg-error-light',
          fill: 'fill-error',
          stroke: 'stroke-error',
          border: 'border-error',
          text: 'text-error',
        };
      } else {
        return {
          bg: 'bg-info',
          bgLight: 'bg-info-light',
          fill: 'fill-info',
          stroke: 'stroke-info',
          border: 'border-info',
          text: 'text-info',
        };
      }
    });

    return { t, input, error, theme };
  },
});
</script>

<style scoped></style>
