<template>
	<article class="pb-4">
		<div class="flex gap-card-sm">
			<Input
				:min="min"
				:autocomplete="autocomplete"
				:hint="hint"
				:name="name"
				:id="id"
				:type="type"
				:label="label"
				:noLabel="noLabel"
				:noTrim="noTrim"
				:light="light"
				:placeholder="placeholder"
				:rules="rules"
				v-model="input"
				class="w-full"
			/>
			<PlusCircleIcon
				@click.prevent="onclickAddToList"
				class="h-12 w-12 text-accent mt-7 cursor-pointer flex-shrink-0"
			/>
		</div>

		<ul>
			<li v-for="item of list" :key="item" class="list-inside list-disc">
				<div
					class="inline-grid grid-cols-[minmax(0,1fr)_auto_auto] justify-between gap-4 w-list"
				>
					<span>{{ item }}</span>
					<XMarkIcon
						@click="onclickRemoveFromList(item)"
						class="w-5 h-5 text-subheading hover:text-error inline-block cursor-pointer stoke-2 stroke-subheading hover:stroke-error"
					/>
					<PencilIcon
						@click="onclickEditListItem(item)"
						class="w-4 h-4 text-subheading hover:text-info inline-block cursor-pointer mt-0.5"
					/>
				</div>
			</li>
		</ul>
	</article>
</template>

<script lang="ts">
import { PencilIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    min: { type: String || Number, default: '' },
    autocomplete: { type: String, default: 'true' },
    hint: { type: String, default: '' },
    name: { type: String, default: '' },
    id: { type: String, default: '' },
    type: { type: String, default: 'text' },
    label: { type: String, default: '' },
    noLabel: { type: Boolean, default: false },
    noTrim: { type: Boolean, default: false },
    light: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    rules: { type: Array, default: [] },
    modelValue: { default: [] },
    max: { type: Number, default: 10 },
  },
  emits: ['update:modelValue', 'valid'],
  components: { PlusCircleIcon, XMarkIcon, PencilIcon },
  setup(props, { emit }) {
    const { t } = useI18n();

    const input = ref('');
    const editItem = ref('');

    const list = computed({
      get() {
        return props.modelValue;
      },
      set(value: Array<string>) {
        emit('update:modelValue', value);
        emit('valid', value && value.length > 0 && value.length <= props.max);
      },
    });

    function onclickAddToList() {
      let alreadyExistsIndex = list.value.findIndex((item) => {
        return item.toLocaleLowerCase() == input.value.toLocaleLowerCase();
      });

      // input is empty
      if (!!!input.value) {
        input.value = '';
        return;
      }

      // if item already exists
      if (alreadyExistsIndex != -1) {
        input.value = '';
        return;
      }

      // if this is for edit item
      if (!!editItem) {
        let arr = list.value.filter((item) => {
          return item.toLocaleLowerCase() != editItem.value.toLocaleLowerCase();
        });

        arr = [input.value, ...arr];
        list.value = [...arr];

        editItem.value = '';
      } else {
        let arr = [input.value, ...list.value];
        list.value = [...arr];
      }

      input.value = '';
    }

    function onclickRemoveFromList(item: string) {
      let arr = list.value.filter((i) => {
        return i.toLocaleLowerCase() != item.toLocaleLowerCase();
      });

      list.value = [...arr];
    }

    function onclickEditListItem(item: string) {
      editItem.value = item;
      input.value = item;
    }

    return {
      t,
      list,
      input,
      onclickAddToList,
      onclickRemoveFromList,
      onclickEditListItem,
    };
  },
});
</script>

<style scoped>
.w-list {
	width: calc(100% - 2.25rem);
}
</style>
