<template>
  <!-- <article
		class="w-full max-w-sm bg-accent rounded-full flex gap-card-sm items-center justify-center px-3 py-1"
	>
		<span class="text-xs font-body flex-1" v-if="solvedTasks > 0">{{ t('Headings.Incorrect') }}: {{solvedTasks}}</span>
		<span class="text-xs font-body flex-1" v-if="solvedOnFirstTryTasks > 0">{{ t('Headings.Incorrect') }}: {{solvedOnFirstTryTasks}}</span>
		<span class="text-xs font-body flex-1" v-if="incorrectTasks > 0">{{ t('Headings.Incorrect') }}: {{incorrectTasks}}</span>
		<span class="text-xs font-body flex-1" 	v-if="correctTasks > 0">{{ t('Headings.Incorrect') }}: {{correctTasks}}</span>
	</article> -->

  <!-- <article class="w-full max-w-sm flex gap-card-sm items-center justify-center">
		<div class="progress-circle bg-info text-heading" v-if="solvedTasks > 0">
			{{ solvedTasks }}
		</div>
		<div
			class="progress-circle bg-accent text-primary"
			v-if="solvedOnFirstTryTasks > 0"
		>
			{{ solvedOnFirstTryTasks }}
		</div>
		<div
			class="progress-circle bg-error text-heading"
			v-if="incorrectTasks > 0"
		>
			{{ incorrectTasks }}
		</div>
		<div
			class="progress-circle bg-success text-heading"
			v-if="correctTasks > 0"
		>
			{{ correctTasks }}
		</div>
	</article> -->

  <section class="w-full flex flex-wrap gap-card items-center justify-center">
    <!-- <p
      class="rounded-full text-sm py-1 px-3.5 font-bold text-primary flex-shrink-0"
      :style="{ background: progressBar }"
    >
      {{ t(progress >= 100 ? "Headings.Completed" : "Headings.Untried") }}:
      {{ solvedTasks }} / {{ tasks.length }}
    </p> -->

    <article
      class="flex gap-2 items-center flex-shrink-0"
      v-if="correctTasks > 0"
    >
      <CheckIcon class="w-5 h-5 text-success" />
      <p class="text-heading">{{ correctTasks }}</p>
    </article>

    <article
      class="flex gap-2 items-center flex-shrink-0"
      v-if="incorrectTasks > 0"
    >
      <XMarkIcon class="w-5 h-5 text-error" />
      <p class="text-heading">{{ incorrectTasks }}</p>
    </article>

    <p
      class="py-1.5 px-3 border border-dashed border-warning text-warning text-sm flex-shrink-0 bg-warning-light rounded-sm"
      v-if="solvedOnFirstTryTasks > 0"
    >
      {{ t("Headings.SolvedFirst") }}: {{ solvedOnFirstTryTasks }}
    </p>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { CheckIcon, XMarkIcon, TrophyIcon } from "@heroicons/vue/24/outline";
import type { PropType } from "vue";
import type { ComputedRef } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { TrophyIcon, CheckIcon, XMarkIcon },
  setup(props) {
    const { t } = useI18n();

    const tasks: ComputedRef<any[]> = computed(() => {
      return props.data?.tasks ?? [];
    });

    const solvedTasks = computed(() => {
      return tasks.value.filter((task) => task.solved).length;
    });

    const solvedOnFirstTryTasks = computed(() => {
      return tasks.value.filter((task) => task.solvedOnFirstTry).length;
    });

    const incorrectTasks = computed(() => {
      return tasks.value.filter((task) => task.solved && !task.correct).length;
    });

    const correctTasks = computed(() => {
      return tasks.value.filter((task) => task.solved && task.correct).length;
    });

    const progress = computed(() => {
      return (solvedTasks.value / tasks.value.length) * 100;
    });

    const progressBar = computed(() => {
      return `linear-gradient(to right, #177edc 0%, #177edc ${progress.value}%, #177ddc58 ${progress.value}%,  #177ddc58 100%)`;
    });

    return {
      t,
      tasks,
      solvedTasks,
      solvedOnFirstTryTasks,
      incorrectTasks,
      correctTasks,
      progress,
      progressBar,
    };
  },
});
</script>

<style scoped>
.progress-circle {
  @apply text-base font-heading w-8 h-8 grid place-items-center rounded-full;
}
</style>
