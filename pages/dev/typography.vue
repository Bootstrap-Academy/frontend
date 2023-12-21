<template>
	<div class="container grid gap-container">
		<section class="grid gap-card">
			<h1 class="text-display-1">This is text-display-1</h1>
			<h2 class="text-display-2">This is text-display-2</h2>
		</section>

		<section class="grid gap-card">
			<h1 class="text-heading-1">This is text-heading-1</h1>
			<h2 class="text-heading-2">This is text-heading-2</h2>
			<h3 class="text-heading-3">This is text-heading-3</h3>
			<h4 class="text-heading-4">This is text-heading-4</h4>
			<h5 class="text-heading-5">This is text-heading-5</h5>
		</section>

		<section>
			<strong class="text-subheading-1">text-subheading-1</strong>
			<h1 class="text-heading-1">This is text-heading-1</h1>
		</section>

		<section>
			<strong class="text-subheading-2">text-subheading-2</strong>
			<h2 class="text-heading-2">This is text-heading-2</h2>
		</section>

		<section class="grid gap-card">
			<p class="text-body-1">This is text-body-1</p>
			<p class="text-body-2">This is text-body-2</p>
		</section>

		<section class="grid gap-card max-w-xl">
			<h2 class="text-heading-2">Line Clamp (1,2,3 &)</h2>
			<p class="text-body-1 clamp line-1">
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci, ut.
				Beatae nam obcaecati asperiores dolores adipisci, numquam aliquid esse
				iusto soluta itaque, nesciunt perspiciatis possimus magni saepe labore
				impedit cumque?
			</p>
			<p class="text-body-1 clamp line-2">
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci, ut.
				Beatae nam obcaecati asperiores dolores adipisci, numquam aliquid esse
				iusto soluta itaque, nesciunt perspiciatis possimus magni saepe labore
				impedit cumque?
			</p>
			<p class="text-body-1 clamp line-3">
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci, ut.
				Beatae nam obcaecati asperiores dolores adipisci, numquam aliquid esse
				iusto soluta itaque, nesciunt perspiciatis possimus magni saepe labore
				impedit cumque?
			</p>
			<p class="text-body-1 clamp line-4">
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci, ut.
				Beatae nam obcaecati asperiores dolores adipisci, numquam aliquid esse
				iusto soluta itaque, nesciunt perspiciatis possimus magni saepe labore
				impedit cumque?
			</p>
		</section>
	</div>
</template>

<script>
definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'Typography',
  },
  setup() {
    return {};
  },
};
</script>
<style scoped></style>
