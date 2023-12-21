<template>
	<section
		class="container-fluid pt-card pb-card flex justify-between items-center gap-container bg-accent overflow-x-scroll snap-x snap-mandatory hide-scrollbar"
	>
		<img
			v-for="(sponsor, i) of sponsors"
			:key="i"
			:src="`/images/sponsors/${sponsor}.webp`"
			class="flex-shrink-0 snap-center object-contain w-28 transition duration-200 ease-out opacity-80 hover:opacity-100"
		/>
	</section>
</template>

<script>
export default {
  setup() {
    let sponsors = ['BWB', 'FHDW', 'GBI', 'ITCS', 'MT5', 'WINGO'];

    return { sponsors };
  },
};
</script>

<style scoped>
img {
	filter: brightness(0) invert(1);
}
</style>
