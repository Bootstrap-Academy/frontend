<!--
  What a visitor without an account learns about the own learning journey, with the ways to an
  account. Registration and login both lead back to the page the visitor is on.
-->
<template>
  <article class="invitation">
    <h2>{{ t("LearningPlan.Invitation.Title") }}</h2>
    <p>{{ t(body) }}</p>
    <div class="ways">
      <NuxtLink :to="{ path: '/auth/signup', query: { redirect: target } }" class="way first">
        {{ t("SkillInvitation.Signup") }}
      </NuxtLink>
      <NuxtLink :to="{ path: '/auth/login', query: { redirect: target } }" class="way">
        {{ t("SkillInvitation.Login") }}
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{ target: string; body: string }>();
const { t } = useI18n();
</script>

<style scoped>
/* The base styles give lists, paragraphs and links the monospace face of older pages. */
.invitation,
.invitation :is(h2, p) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.invitation {
  display: grid;
  gap: 12px;
  padding: 24px;
  border: 1px solid #2c4259;
  border-radius: 18px;
  background: radial-gradient(ellipse at 20% 0%, #12474c80, transparent 60%), #102b38;
}
h2 {
  margin: 0;
  color: #edf3fb;
  font-size: 1.3rem;
  font-weight: 650;
}
p {
  margin: 0;
  color: #c4d2e1;
  line-height: 1.55;
}
.ways {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}
.way {
  @apply flex min-h-11 items-center justify-center rounded border border-accent px-5 py-3 text-center text-sm font-bold uppercase tracking-widest text-heading font-body transition-basic hover:ring-4 hover:ring-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
.way.first {
  @apply bg-accent text-primary;
}
</style>
