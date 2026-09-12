<template>
  <section class="skill-progress-table">
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t("CharacterDashboard.Skills") }}</th>
          <th scope="col">{{ t("Headings.Level") }}</th>
          <th scope="col">XP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(skill, index) in data" :key="skill.skill || index">
          <th scope="row">
            <NuxtLink
              :to="`/skill-tree/${encodeURIComponent(rootSkillId)}/${encodeURIComponent(skill.skill || '')}`"
              >{{ (skill.skill || "").replaceAll("_", " ") }}</NuxtLink
            >
          </th>
          <td>{{ skill.level || 0 }}</td>
          <td>{{ abbreviateNumber(skill.xp || 0) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
withDefaults(
  defineProps<{
    data?: { skill: string; level: number; xp: number; completed?: boolean }[];
    rootSkillId?: string;
  }>(),
  { data: () => [], rootSkillId: "" }
);
const { t } = useI18n();
</script>

<style scoped>
.skill-progress-table {
  overflow-x: auto;
  padding: 1rem 0;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: right;
  padding: 0.9rem 0.6rem;
  border-bottom: 1px solid var(--color-tertiary);
}
th:first-child {
  text-align: left;
}
thead {
  color: var(--color-subheading);
  font-size: 0.85rem;
}
tbody th {
  font-weight: 500;
}
a {
  color: var(--color-heading);
  overflow-wrap: anywhere;
}
a:hover {
  color: var(--color-accent);
}
a:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 4px;
}
</style>
