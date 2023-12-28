<template>
	<section class="pb-4">
		<header class="flex gap-card justify-between">
			<h2 class="text-heading-3">{{ t(label) }}</h2>
			<Btn
				:icon="PlusIcon"
				sm
				secondary
				@click="onclickAddItem"
				:class="{
					'opacity-60 pointer-events-none': !isValid,
				}"
			>
				{{ t('Buttons.AddExample') }}
			</Btn>
		</header>

		<div v-for="(item, i) of list" :key="`example-${i}`" class="flex gap-card">
			<article
				class="w-full grid grid-cols-1 gap-y-1 border-2 py-2 px-4 style-box mt-box"
				:class="isValid ? 'border-secondary' : 'border-error'"
			>
				<Input
					name="Inputs.TaskName"
					id="Inputs.TaskName"
					placeholder="Inputs.TaskName"
					v-model="item.name"
					class="w-full"
					:rules="i == list.length - 1 && !!nameErrorMsg  ? [(v:string)=>nameErrorMsg]:[]"
				/>

				<article>
					<Btn
						tertiary
						class="!pb-1"
						@click="
							inputMarkdownModal = true;
							selectedItemIndex = i;
						"
					>
						{{ t('Buttons.ManageInput') }}
					</Btn>
					<div
						class="markdown clamp line-1 italic opacity-70"
						v-html="$md.render(item.input)"
					></div>
				</article>

				<article class="mt-box">
					<Btn
						tertiary
						class="!pb-1"
						@click="
							outputMarkdownModal = true;
							selectedItemIndex = i;
						"
					>
						{{ t('Buttons.ManageOutput') }}
					</Btn>
					<div
						class="markdown clamp line-1 italic opacity-70"
						v-html="$md.render(item.output)"
					></div>
				</article>
			</article>

			<XMarkIcon
				@click="onclickDeleteItem(i)"
				class="mt-10 w-8 h-8 text-subheading hover:text-error cursor-pointer flex-shrink-0"
			/>
		</div>

		<Modal v-if="inputMarkdownModal">
			<article class="style-card bg-secondary max-w-screen-lg w-full">
				<div class="card overflow-scroll max-h-[80vh]">
					<h2 class="text-heading-2 mb-box">
						{{ t('Buttons.ManageInput') }}
					</h2>
					<MarkdownEditor v-model="input" />
				</div>

				<div class="card flex gap-card flex-wrap bg-[#1c3250]">
					<Btn tertiary @click="updateItemInList({ input: '' })">
						{{ t('Buttons.Delete') }}
					</Btn>

					<div class="flex-1"></div>

					<Btn @click="updateItemInList({ input: input })">
						{{ t('Buttons.SaveInput') }}
					</Btn>
					<Btn
						secondary
						@click="
							selectedItemIndex = -1;
							inputMarkdownModal = false;
						"
					>
						{{ t('Buttons.Cancel') }}
					</Btn>
				</div>
			</article>
		</Modal>

		<Modal v-if="outputMarkdownModal">
			<article class="style-card bg-secondary max-w-screen-lg w-full">
				<div class="card overflow-scroll max-h-[80vh]">
					<h2 class="text-heading-2 mb-box">
						{{ t('Buttons.ManageOutput') }}
					</h2>
					<MarkdownEditor v-model="output" />
				</div>

				<div class="card flex gap-card flex-wrap bg-[#1c3250]">
					<Btn tertiary @click="updateItemInList({ output: '' })">
						{{ t('Buttons.Delete') }}
					</Btn>

					<div class="flex-1"></div>

					<Btn @click="updateItemInList({ output: output })">
						{{ t('Buttons.SaveOutput') }}
					</Btn>
					<Btn
						secondary
						@click="
							selectedItemIndex = -1;
							outputMarkdownModal = false;
						"
					>
						{{ t('Buttons.Cancel') }}
					</Btn>
				</div>
			</article>
		</Modal>
	</section>
</template>

<script lang="ts">
import {
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/solid';
import { defineComponent } from 'vue';
import type { PropType, Ref } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    modelValue: { default: [] },
    max: { type: Number, default: 10 },
    label: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'valid'],
  components: { PlusCircleIcon, XMarkIcon, PencilIcon, PlusIcon },
  setup(props, { emit }) {
    const { t } = useI18n();

    const list = computed({
      get() {
        return props.modelValue;
      },
      set(value: Array<any>) {
        emit('update:modelValue', value);
      },
    });

    function onclickAddItem() {
      list.value = [
        {
          name: `Example ${list.value.length + 1}`,
          input: '',
          output: '',
        },
        ...list.value,
      ];
    }
    function onclickDeleteItem(index: number) {
      let arr = [...list.value];
      arr.splice(index, 1);
      list.value = [...arr];
    }

    const selectedItemIndex = ref(-1);

    const input = ref('');
    const inputMarkdownModal = ref(false);

    const output = ref('');
    const outputMarkdownModal = ref(false);

    function updateItemInList(obj: any) {
      list.value.splice(selectedItemIndex.value, 1, {
        ...list.value[selectedItemIndex.value],
        ...obj,
      });

      selectedItemIndex.value = -1;
      inputMarkdownModal.value = false;
      outputMarkdownModal.value = false;
    }

    function filterListBasedOnKey(key: string) {
      return list.value.filter((item) => {
        return (
          item[key].toLocaleLowerCase() ==
					lastItemInList.value[key].toLocaleLowerCase()
        );
      });
    }

    const isListEmpty = computed(() => {
      return list.value.length <= 0;
    });

    const lastItemInList = computed(() => {
      return isListEmpty.value ? null : list.value[list.value.length - 1];
    });

    const nameErrorMsg = computed(() => {
      let msg = '';
 
      if (!!!lastItemInList.value) return msg;

      let arrOfThisItem = filterListBasedOnKey('name');

      if (!!!lastItemInList.value.name) {
        msg = 'Errors.ExampleNameCannotBeEmpty';
      } else if (arrOfThisItem.length > 1) {
        msg = 'Errors.ExampleNameCannotBeSame';
      }

      return msg;
    });

    const isValid = computed(() => {
      return isListEmpty.value ? true : !!!nameErrorMsg.value;
    });

    return {
      PlusIcon,
      t,
      list,
      onclickAddItem,
      onclickDeleteItem,
      selectedItemIndex,
      inputMarkdownModal,
      outputMarkdownModal,
      input,
      output,
      updateItemInList,
      nameErrorMsg,
      isValid,
    };
  },
});
</script>

<style scoped>
.w-list {
	width: calc(100% - 2.25rem);
}
</style>
