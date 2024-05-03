<template>
	<div class="relative">
		<div class="flex flex-wrap gap-card-sm items-center">
			<label v-if="!noLabel" class="text-body-1 text-body font-body block mb-3">
				{{ t(label) }}
			</label>
			<p v-if="label" class="pb-3 text-xs text-body relative z-50 text-center">
				<span v-if="hint">{{ t(hint) }}</span>
				<slot v-else name="hint" :t="t" />
			</p>
		</div>
		<label
			:for="id"
			class="relative z-10 bg-secondary overflow-hidden flex justify-center items-center shadow-lg mx-auto"
			:class="[
				{
					'cursor-pointer': !noInput,
					'w-40 h-40': !video,
					'w-60 h-40': video,
				},
				rounded ? 'rounded-full' : 'rounded-md',
			]"
		>
			<img
				class="object-cover w-full h-full"
				v-if="url && !video"
				:src="url"
				:alt="alt"
			/>
			<video
				v-else-if="url && video"
				controls
				class="object-cover w-full h-full"
			>
				<source :src="url" type="video/mp4" />
				Browser not supported
			</video>
			<PlusIcon v-else class="w-10 h-10 fill-accent" />

			<input
				v-if="!noInput"
				class="hidden"
				:id="id"
				ref="DOM_INPUT"
				type="file"
				@change="onchangeSetMedia"
				:accept="accept"
			/>
		</label>
		<p v-if="!label" class="py-3 text-xs text-body relative z-50 text-center">
			<span v-if="hint">{{ t(hint) }}</span>
			<slot v-else name="hint" :t="t" />
		</p>
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
import { PlusIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: { PlusIcon },
  props: {
    label: { type: String, default: '' },
    alt: { type: String, default: '' },
    noLabel: { type: Boolean, default: false },
    hint: { type: String, default: '' },
    rounded: { type: Boolean, default: false },
    noInput: { type: Boolean, default: false },
    video: { type: Boolean, default: false },
    id: { type: String, default: '' },
    maxSize: { type: Number, default: 5 },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'valid', 'file'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const error = ref('');
    const DOM_INPUT = ref<HTMLInputElement | null>(null);

    function onchangeSetMedia(event: any) {
      let file = event?.target?.files[0] ?? null;

      validate(file);
      emit('file', !!!error.value ? file : null);

      if (!!!file) return;
      url.value = URL.createObjectURL(file);
    }

    const accept = computed(() => {
      return props.video ? 'video/mp4' : 'image/png,image/jpg,image/jpeg';
    });

    const url = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit('update:modelValue', value);
      },
    });

    function validate(file: File) {
      let label = props.video ? 'video' : 'image';

      if (DOM_INPUT) {
        if (!!!file && !!!url.value) {
          error.value = `${label} cannot be empty`;
        } else if (!!file && file.size && file.size / 8000000 > props.maxSize) {
          error.value = `${label} must be less than 5 mb`;
        } else {
          error.value = ``;
        }

        if (!DOM_INPUT.value) return;

        DOM_INPUT.value.setCustomValidity(error.value);
        emit('valid', !!!error.value);
      }
    }

    return { t, onchangeSetMedia, accept, DOM_INPUT, error, url };
  },
});
</script>

<style scoped></style>
