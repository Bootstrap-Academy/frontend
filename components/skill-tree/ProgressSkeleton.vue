<template>
	<article class="progress-card rounded overflow-clip">
		<div
			class="progress-bar h-1 w-full transition-basic animate-pulse"
			:style="{ background: progressBar }"
		></div>

		<article class="box py-3 px-4 grid bg-primary rounded gap-x-3 md:gap-x-5">
			<SkeletonMedia
				:noAnimate="noAnimate"
				class="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded"
			/>

			<h6 class="text-body-1 sm:clamp sm:line-1 break-words capitalize">
				<SkeletonText sm :noAnimate="noAnimate" class="mb-1" />

				<div
					class="mt-2 flex flex-wrap gap-box w-full items-center text-body-2 text-subheading font-body"
				>
					<div class="flex items-center gap-3">
						<span class="text-body">
							<SkeletonText
								:noAnimate="noAnimate"
								body
								sm
								class="w-[1.75rem] inline-block"
							/>
							/
							<SkeletonText
								:noAnimate="noAnimate"
								body
								sm
								class="w-[1.75rem] inline-block"
							/>
						</span>
						skills
					</div>
					<div class="text-heading-2 leading-none text-accent">•</div>
					<div class="flex items-center gap-3">
						XP
						<SkeletonText
							:noAnimate="noAnimate"
							body
							sm
							class="w-[1.75rem] inline-block"
						/>
					</div>
					<div class="text-heading-2 leading-none text-accent">•</div>
					<div class="flex items-center gap-3">
						Level
						<SkeletonText
							:noAnimate="noAnimate"
							body
							sm
							class="w-[1.75rem] inline-block"
						/>
					</div>
				</div>
			</h6>

			<Chip xs class="place-self-start flex-shrink-0 w-[5rem]">
				<span class="text-transparent">---</span>
			</Chip>

			<!-- <SubMenu /> -->
			<div class="flex items-center gap-2 place-self-start">
				<Icon rounded sm :icon="EyeIcon" />
				<Icon rounded sm :icon="ChevronDownIcon" />
			</div>
		</article>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { EyeIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  props: { noAnimate: { type: Boolean, default: false } },
  components: { EyeIcon, ChevronDownIcon },
  setup() {
    const total = computed(() => {
      return getRandomNumber(20, 50);
    });
    const completed = computed(() => {
      return getRandomNumber(1, total.value);
    });

    const progress = computed(() => {
      return Math.round((completed.value / total.value) * 100);
    });

    const progressBar = computed(() => {
      return `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${progress.value}%, var(--color-tertiary) ${progress.value}%,  var(--color-tertiary) 100%)`;
    });
    return { total, completed, progressBar, EyeIcon, ChevronDownIcon };
  },
});
</script>

<style scoped>
.box {
	grid-template-columns: auto minmax(0, 1fr) auto;
	grid-template-areas:
		'img chip submenu'
		'name name name';
}

.box > *:nth-child(1) {
	grid-area: img;
}
.box > *:nth-child(2) {
	grid-area: name;
	@apply mt-2 sm:mt-0;
}
.box > *:nth-child(3) {
	grid-area: chip;
	@apply mt-2 sm:mt-1;
}
.box > *:nth-child(4) {
	grid-area: submenu;
	@apply mt-2 sm:mt-0;
}

@media screen and (min-width: 525px) {
	.box {
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		grid-template-areas: 'img name chip submenu';
	}
}
</style>
