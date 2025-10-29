<template>
  <main class="mt-main mb-main container">
    <SectionTitle
      subheading="Subheadings.GetMorphcoins"
      heading="Headings.GetMorphcoins"
      body="Body.GetMorphcoins"
      center
      full
    />

    <section class="card grid w-full bg-secondary style-card gap-card mt-card mb-card">
      <article
        v-for="(option, i) of options"
        :key="option.type"
        class="card grid grid-cols-[auto_1fr] gap-1 gap-x-4 bg-primary style-card md:gap-x-5"
      >
        <div class="box row-span-2 h-fit flex-shrink-0 bg-tertiary style-box">
          <component
            class="text-accent"
            :class="option.lg ? 'h-6 w-6 xl:h-7 xl:w-7' : 'h-5 w-5 xl:h-6 xl:w-6'"
            :is="option.icon"
          ></component>
        </div>

        <h3 class="text-heading-3 flex items-center justify-between self-center gap-card">
          {{ t(`List.GetMorphcoins.${i + 1}.Heading`) }}
        </h3>

        <p class="text-body-2 col-span-2 text-body sm:col-span-1">
          {{ t(`List.GetMorphcoins.${i + 1}.Body`) }}
        </p>

        <NuxtLink :to="option.pathname" class="col-span-2 justify-self-end mt-box">
          <Btn sm>{{ t(option.button) }}</Btn>
        </NuxtLink>
      </article>
    </section>

    <div class="text-center">
      <a secondary>{{ t("Body.MoreComingSoon") }}</a>
    </div>
  </main>
</template>

<script lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import {
  AcademicCapIcon,
  BriefcaseIcon,
  UserGroupIcon,
  IdentificationIcon,
  ShoppingCartIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/vue/24/outline";
import IconBug from "~/components/icon/Bug.vue";
import IconCoaching from "~/components/icon/Coaching.vue";
import { useI18n } from "vue-i18n";

export default {
  head: {
    title: "Get Morphcoins without paying",
  },
  components: {
    AcademicCapIcon,
    BriefcaseIcon,
    UserGroupIcon,
    IdentificationIcon,
    ShoppingCartIcon,
    IconBug,
    IconCoaching,
    ChatBubbleLeftIcon,
  },
  setup() {
    const { t } = useI18n();

    let options = [
      {
        icon: ShoppingCartIcon,
        button: "Buttons.GoToShop",
        pathname: "/morphcoins/buy",
        type: "buy",
      },
      {
        icon: BriefcaseIcon,
        button: "Buttons.ExploreJobs",
        pathname: "/jobs",
        type: "jobs",
      },
      {
        icon: AcademicCapIcon,
        button: "Buttons.ContactUs",
        pathname: "/contact",
        type: "lectures",
      },
      {
        icon: UserGroupIcon,
        button: "Buttons.ExploreSkill",
        pathname: "/skill-tree/it_paedagoge_und_dozent",
        type: "webinars",
      },
      {
        icon: IconCoaching,
        button: "Buttons.ExploreSkill",
        pathname: "/skill-tree/it_paedagoge_und_dozent",
        type: "coach",
      },
      {
        icon: IconBug,
        lg: true,
        button: "Buttons.ContactUs",
        pathname: "/contact",
        type: "bugBounty",
      },
    ];

    return { options, t };
  },
};
</script>

<style scoped></style>
