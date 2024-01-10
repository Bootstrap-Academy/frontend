<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Display data

✅ Recaptcha
✅ Api implemented
✅ Form Client Side Error Handling
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
	<main
		class="container-fluid flex flex-col midXl:flex-row items-center justify-center midXl:justify-between gap-container mt-container mb-container"
	>
		<section class="grid gap-card midXl:min-w-[350px]" ref="staggeringAOS">
			<SectionTitle
				size="lg"
				:subheading="title.subheading"
				:heading="title.heading"
				:body="title.body"
				class="mb-card"
			/>

			<article
				v-for="({ icon, body }, i) of contactInfo"
				:key="i"
				class="grid grid-cols-[auto_1fr] gap-x-6"
			>
				<div class="bg-tertiary p-3 lg:p-4 rounded-lg h-fit w-fit row-span-2">
					<component
						class="w-5 h-5 xl:w-6 xl:h-6 text-accent"
						:is="icon"
					></component>
				</div>
				<p class="font-body text-subheading text-heading-5">
					{{ t(`List.Contact.${i + 1}.Heading`) }}
				</p>
				<h6 class="font-heading text-heading-4">
					{{ body }}
				</h6>
			</article>
		</section>

		<section class="container-form h-fit">
			<FormContact />
		</section>
	</main>
</template>

<script lang="ts">
import { MapPinIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default {
  head: {
    title: 'Contact Us',
  },
  setup() {
    const { t } = useI18n();

    const staggeringAOS = ref<HTMLDivElement | null>(null);

    const title = {
      subheading: `Subheadings.ContactUs`,
      heading: `Headings.ContactUs`,
      body: `Body.ContactUs`,
    };

    let contactInfo = [
      {
        icon: MapPinIcon,
        body: 'Wittelsbacherplatz 1 80333 München',
      },
      {
        icon: EnvelopeIcon,
        body: 'hallo@bootstrap.academy',
      },
      {
        icon: PhoneIcon,
        body: '+49 89 24 88 62 51 - 8',
      },
    ];

    onMounted(() => {
      setStaggeringAOSViaParent(staggeringAOS.value, 'aos', 'show', [0]);
    });

    return { title, contactInfo, staggeringAOS, t };
  },
};
</script>

<style scoped></style>
