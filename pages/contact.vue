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
    class="container-fluid flex flex-col items-center justify-center gap-container mt-container mb-container midXl:flex-row midXl:justify-between"
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
        <div class="row-span-2 h-fit w-fit rounded-lg bg-tertiary p-3 lg:p-4">
          <component class="h-5 w-5 text-accent xl:h-6 xl:w-6" :is="icon"></component>
        </div>
        <p class="text-heading-5 text-subheading font-body">
          {{ t(`List.Contact.${i + 1}.Heading`) }}
        </p>
        <h6 class="text-heading-4 font-heading">
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
import { MapPinIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default {
  head: {
    title: "Contact Us",
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
        body: "Wittelsbacherplatz 1 80333 München",
      },
      {
        icon: EnvelopeIcon,
        body: "hallo@bootstrap.academy",
      },
      {
        icon: PhoneIcon,
        body: "+49 89 24 88 62 51 - 8",
      },
    ];

    onMounted(() => {
      setStaggeringAOSViaParent(staggeringAOS.value, "aos", "show", [0]);
    });

    return { title, contactInfo, staggeringAOS, t };
  },
};
</script>

<style scoped></style>
