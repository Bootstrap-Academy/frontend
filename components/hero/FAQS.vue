<template>
	<section class="container">
		<SectionTitle
			full
			center
			subheading="Subheadings.HeroFAQS"
			heading="Headings.HeroFAQS"
			body="Body.HeroFAQS"
			class="max-w-2xl mx-auto mb-card"
		/>

		<FAQ
			v-for="({ expand }, i) of faqs"
			:key="i"
			:heading="`List.HeroFAQS.${i + 1}.Heading`"
			:body="`List.HeroFAQS.${i + 1}.Body`"
			:link="i + 1 == 1 ? { to: '/morphcoins', text: 'Links.Here' } : null"
			:expand="expand"
			@expand="setExpand(i)"
		/>
	</section>
</template>

<script>
export default {
  setup() {
    const faqs = ref([
      { expand: false },
      { expand: false },
      { expand: false },
      { expand: false },
      { expand: false },
    ]);

    function setExpand(index) {
      for (let i = 0; i < faqs.value.length; i++) {
        // invert expand-state for clicked item, close all others
        faqs.value[i].expand = i == index ? !faqs.value[i].expand : false;
      }
    }

    return { faqs, setExpand };
  },
};
</script>

<style lang="scss" scoped></style>
