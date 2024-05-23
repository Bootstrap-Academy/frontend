<template>
  <section class="card style-card bg-secondary">
    <img
      :src="image"
      :alt="t('AltAttributes.UserAvatar')"
      class="w-32 h-32 rounded-full bg-tertiary mx-auto mb-box shadow-xl shadow-primary"
    />
    <h2 class="text-heading-2 text-center clamp line-1">{{ username }}</h2>
    <p class="text-body-1 text-center clamp line-1">{{ nickname }}</p>

    <NuxtLink to="/profile/edit" class="block mx-auto mt-box mb-card">
      <Btn secondary sm class="mx-auto">{{ t("Buttons.EditProfile") }}</Btn>
    </NuxtLink>

    <p class="text-body-1 text-heading text-justify mb-card mt-box">
      {{ description }}
    </p>

    <IconText class="mb-2 truncate" :icon="email.icon">
      {{ email.text }}
    </IconText>
    <IconText :icon="registration.icon">{{ registration.text }}</IconText>

    <article
      class="flex gap-x-3 gap-y-3.5 flex-wrap mt-card"
      v-if="tags && tags.length"
    >
      <Chip v-for="tag of tags" :key="tag">{{ tag }}</Chip>
    </article>

    <InputBtn class="mt-8 w-full" @click="navigateTo('/subscription')">
      {{
        !isPremium ? t("Buttons.BuySubscription") : t("Buttons.ManagePremium")
      }}
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

    const image = computed(() => {
      return props.data?.avatar_url ?? "/images/about-2.webp";
    });

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

    const showFreeQuizzesOnly = useCookie("showFreeQuizzesOnly");
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
