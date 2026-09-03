<template>
  <section class="card bg-secondary style-card">
    <Avatar
      :name="nickname || username"
      class="mx-auto h-32 w-32 shadow-xl shadow-primary mb-box"
    />
    <h2 class="clamp line-1 text-heading-2 text-center">{{ username }}</h2>
    <p class="clamp line-1 text-body-1 text-center">{{ nickname }}</p>

    <NuxtLink to="/profile/edit" class="mx-auto block mt-box mb-card">
      <Btn secondary sm class="mx-auto">{{ t("Buttons.EditProfile") }}</Btn>
    </NuxtLink>

    <p class="text-body-1 text-justify text-heading mt-box mb-card">
      {{ description }}
    </p>

    <IconText class="mb-2 truncate" :icon="email.icon">
      {{ email.text }}
    </IconText>
    <IconText :icon="registration.icon">{{ registration.text }}</IconText>

    <article class="flex flex-wrap gap-x-3 gap-y-3.5 mt-card" v-if="tags && tags.length">
      <Chip v-for="tag of tags" :key="tag">{{ tag }}</Chip>
    </article>

    <InputBtn class="mt-8 w-full" @click="navigateTo('/subscription')">
      {{ !isPremium ? t("Buttons.BuySubscription") : t("Buttons.ManagePremium") }}
    </InputBtn>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { EnvelopeIcon, CalendarIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";

export default {
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { EnvelopeIcon, CalendarIcon },
  setup(props) {
    const { t } = useI18n();

    const username = computed(() => {
      return props.data?.name ?? "";
    });

    const nickname = computed(() => {
      return props.data?.display_name ?? "";
    });

    const description = computed(() => {
      return props.data?.description ?? "";
    });

    const email = computed(() => {
      return {
        icon: EnvelopeIcon,
        text: props.data?.email ?? "",
      };
    });

    const registration = computed(() => {
      let timestamp = props.data?.registration ?? null;

      let { month, year } = convertTimestampToDate(timestamp);

      return {
        icon: CalendarIcon,
        text: !!timestamp ? `${t(month.string)}, ${year}` : "",
      };
    });

    const tags = computed(() => {
      return props.data?.tags ?? ["	Web Developer", "	UI UX", "Computer"];
    });

    const premiumInfo: any = usePremiumInfo();
    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });

    onMounted(async () => {
      await getPremiumStatus();
    });

    const showFreeQuizzesOnly = useAppCookie("showFreeQuizzesOnly");
    return {
      image,
      username,
      nickname,
      description,
      registration,
      email,
      tags,
      t,
      showFreeQuizzesOnly,
      isPremium,
    };
  },
};
</script>

<style scoped></style>
