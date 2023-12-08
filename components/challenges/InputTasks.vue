<template>
	<section class="pb-4">
		<header class="flex gap-card justify-between">
			<h2 class="text-heading-3">{{ t(label) }}</h2>
			<Btn
				:icon="PlusIcon"
				sm
				secondary
				@click="onclickAddTask"
				:class="{
					'opacity-60 pointer-events-none':
						(!!nameErrorMsg && tasks.length > 0) ||
						(!!pointsErrorMsg && tasks.length > 0),
				}"
			>
				{{ t('Buttons.AddTask') }}
			</Btn>
		</header>

		<div v-for="(task, i) of tasks" :key="`task-${i}`" class="flex gap-card">
			<article
				class="w-full grid grid-cols-[minmax(0,1fr)_auto] gap-x-card-sm gap-y-2 border-2 py-2 px-4 style-box mt-box"
				:class="
					(!!nameErrorMsg && i == tasks.length - 1) ||
					(!!pointsErrorMsg && i == tasks.length - 1)
						? 'border-error'
						: 'border-secondary'
				"
			>
				<Input
					name="Inputs.TaskName"
					id="Inputs.TaskName"
					placeholder="Inputs.TaskName"
					v-model="task.name"
					class="w-full"
					:rules="!!nameErrorMsg && i == tasks.length - 1 ? [(v:string)=>nameErrorMsg]:[]"
				/>

				<Input
					name="Inputs.TaskTotalPoints"
					id="Inputs.TaskTotalPoints"
					placeholder="Inputs.TaskTotalPoints"
					v-model="task.totalPoints"
					class="w-32"
					type="number"
					:rules="!!pointsErrorMsg && i == tasks.length - 1 ? [(v:string)=>pointsErrorMsg]:[]"
				/>

				<div
					v-if="!!task.description"
					class="markdown clamp line-1 col-span-2"
					v-html="$md.render(task.description)"
				></div>
				<Btn
					tertiary
					class="!pt-0 !pb-1 w-fit"
					@click="
						taskIndex = i;
						description = task.description;
					"
				>
					{{ t('Buttons.ManageDescription') }}
				</Btn>
			</article>

			<XMarkIcon
				@click="onclickRemoveTask(i)"
				class="mt-10 w-8 h-8 text-subheading hover:text-error cursor-pointer flex-shrink-0"
			/>
		</div>

		<Modal v-if="taskIndex > -1">
			<div class="card style-card bg-secondary max-w-screen-lg w-full">
				<MarkdownEditor v-model="description" />
				<div class="flex gap-card flex-wrap">
					<Btn @click="onclickSaveDescription">
						{{ t('Buttons.SaveDescription') }}
					</Btn>
					<Btn secondary @click="taskIndex = -1">
						{{ t('Buttons.Cancel') }}
					</Btn>

					<div class="flex-1"></div>

					<Btn tertiary @click="onclickDeleteDescription">
						{{ t('Buttons.DeleteDescription') }}
					</Btn>
				</div>
			</div>
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
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { description } from '~~/description';

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
  components: { PlusCircleIcon, XMarkIcon, PencilIcon, PlusIcon },
  setup(props, { emit }) {
    const { t } = useI18n();

    const tasks = computed({
      get() {
        return props.modelValue;
      },
      set(value: Array<any>) {
        emit('update:modelValue', value);
      },
    });

    function onclickAddTask() {
      if (
        (!!nameErrorMsg.value && tasks.value.length > 0) ||
				(!!pointsErrorMsg.value && tasks.value.length > 0)
      )
        return;

      tasks.value = [
        ...tasks.value,
        {
          name: `Task ${tasks.value.length + 1}`,
          totalPoints: 5,
          description: '',
        },
      ];
    }
    function onclickRemoveTask(index: number) {
      let arr = [...tasks.value];
      arr.splice(index, 1);
      tasks.value = [...arr];
    }

    const nameErrorMsg = computed(() => {
      let msg = '';

      let length = tasks.value.length;
      if (length == 0) return true;

      let lastTask = tasks.value[length - 1];
      let arr = tasks.value.filter((t) => {
        return t.name.toLocaleLowerCase() == lastTask.name.toLocaleLowerCase();
      });

      if (!!!lastTask.name) {
        msg = 'Errors.TaskNameCannotBeEmpty';
      } else if (arr.length > 1) {
        msg = 'Errors.TaskNameCannotBeSame';
      }

      return msg;
    });

    const pointsErrorMsg = computed(() => {
      let msg = '';

      let length = tasks.value.length;

      if (length == 0) return msg;

      let lastTask = tasks.value[length - 1];

      if (lastTask.totalPoints < 5) {
        msg = 'must be >= 5';
      } else if (lastTask.totalPoints > 100) {
        msg = 'must be <= 100';
      }

      return msg;
    });

    const openMarkdown = ref(false);
    const taskIndex = ref(-1);

    const description = ref('');

    function onclickSaveDescription() {
      let arr = tasks.value.map((t, index) => {
        return {
          ...t,
          description:
						index == taskIndex.value ? description.value : t.description,
        };
      });

      tasks.value = [...arr];

      taskIndex.value = -1;
    }

    function onclickDeleteDescription() {
      let arr = tasks.value.map((t, index) => {
        return {
          ...t,
          description: index == taskIndex.value ? '' : t.description,
        };
      });

      tasks.value = [...arr];

      taskIndex.value = -1;
    }

    return {
      description,
      t,
      tasks,
      PlusIcon,
      onclickAddTask,
      onclickRemoveTask,
      nameErrorMsg,
      pointsErrorMsg,
      openMarkdown,
      taskIndex,
      onclickSaveDescription,
      onclickDeleteDescription,
    };
  },
});
</script>

<style scoped>
.w-list {
	width: calc(100% - 2.25rem);
}
</style>
