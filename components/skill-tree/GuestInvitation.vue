<!--
  What a visitor without an account gets after choosing a skill: the name of the skill, what
  lies behind it and the ways on. The page of the skill needs an account, so the registration
  and the login both carry that page as the place to come back to.
-->
<template>
  <article class="card relative grid w-full max-w-lg bg-secondary text-center style-card gap-card">
    <h2 class="text-heading-2 px-8 [overflow-wrap:anywhere]">{{ skill.name }}</h2>

    <p class="text-body-1 m-0">{{ t("SkillInvitation.Body", courses) }}</p>

    <div class="grid gap-box">
      <NuxtLink :to="{ path: '/auth/signup', query: { redirect: target } }" class="way first">
        {{ t("SkillInvitation.Signup") }}
      </NuxtLink>
      <NuxtLink :to="{ path: '/auth/login', query: { redirect: target } }" class="way">
        {{ t("SkillInvitation.Login") }}
      </NuxtLink>
    </div>

    <NuxtLink to="/courses" class="courses">{{ t("SkillInvitation.Courses") }}</NuxtLink>

    <!-- The cross stands last in the order of the keyboard, so the ways on come first. -->
    <button type="button" class="close" :aria-label="t('Buttons.Close')" @click="emit('close')">
      <XMarkIcon class="h-6 w-6" aria-hidden="true" />
    </button>
  </article>
</template>

<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  /** The id of the tree the skill belongs to. */
  tree: string;
  skill: { id: string; name: string; courses?: string[] };
}>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

// The sentence has one form for a skill without a course, one for a single course and one for several.
const courses = computed(() => props.skill.courses?.length ?? 0);
const target = computed(
  () => `/skill-tree/${encodeURIComponent(props.tree)}/${encodeURIComponent(props.skill.id)}`
);
</script>

<style scoped>
.way {
  @apply flex min-h-11 items-center justify-center rounded border border-accent px-5 py-3 text-center text-sm font-bold uppercase tracking-widest text-heading font-body transition-basic hover:ring-4 hover:ring-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
.way.first {
  @apply bg-accent text-primary;
}
.courses {
  @apply inline-flex min-h-11 items-center justify-self-center text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
.close {
  @apply absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded text-body transition-basic hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent;
}
</style>
