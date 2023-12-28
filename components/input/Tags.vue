<template>
	<div>
		<Input
			:label="label"
			v-model="input"
			@valid="emitValid($event)"
			:rules="rules"
			:noLabel="noLabel"
			:placeholder="placeholder"
			:type="type"
			:name="name"
			:id="id"
			no-trim
			hint="Body.AddTags"
		/>
		<div class="mt-2 min-h-[35px] relative z-30">
			<div class="flex flex-wrap gap-3" v-if="tags && tags.length > 0">
				<TransitionGroup mode="out-in" name="slide-up">
					<Chip
						v-for="tag of tags"
						:key="tag"
						:icon="XMarkIcon"
						icon-right
						@iconClick="onclickRemoveTag(tag)"
					>
						{{ tag }}
					</Chip>
				</TransitionGroup>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: { XMarkIcon },
  props: {
    name: { type: String, default: '' },
    id: { type: String, default: '' },
    type: { type: String, default: 'text' },
    label: { type: String, default: '' },
    noLabel: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    rules: { type: Array, default: [] },
    modelValue: { type: Array as PropType<string[]>, default: [] },
  },
  emits: ['update:modelValue', 'valid'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const input = ref('');
    const isValid = ref(true);

    const tags = computed(() => {
      if (!isValid.value || !!!input.value.includes(' ')) {
        return [...props.modelValue];
      }

      let arr: string[] = input.value.split(' ');

      arr = arr.filter((string) => !!string);
      arr = [...props.modelValue, ...arr];
      arr = [...new Set(arr)];

      emit('update:modelValue', [...arr]);

      input.value = '';

      return arr;
    });

    function onclickRemoveTag(chip: string) {
      let newArr = props.modelValue.filter((item) => item != chip);
      emit('update:modelValue', newArr);
    }

    function emitValid(valid: boolean) {
      isValid.value = valid;
      emit('valid', valid);
    }

    return { t, emitValid, input, tags, onclickRemoveTag, XMarkIcon };
  },
});
</script>
