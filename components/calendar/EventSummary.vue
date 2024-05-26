!
<template>
	<div class="style-card bg-secondary w-full max-w-3xl relative overflow-y-scroll max-h-full p-10">
		<div class="max-sm:flex max-sm:justify-end">
			<Btn sm icon-right secondary class="sm:absolute sm:end-10" @click="$emit('cancel')">
				{{ t("Buttons.Close") }}
		    </Btn>
		</div>
		<div class="h-full max-h-3xl space-y-4 flex flex-col">
			<div>
				<h4 class="font-bold text-heading">
				    {{ t("Headings.Instructor") }}
			    </h4>

			    <div class="flex space-x-4 items-center">
			    	<Rating :rating="event.instructor_rating ?? 0" sm stars />
			    	<div class="flex items-center gap-2">
			    		<img :src="event.instructor.avatar_url ?? '/images/about-2.webp'"
			    			class="w-6 h-6 object-cover rounded-[50px]" 
							:alt="t('AltAttributes.EventInstructorAvatar')" />
			    		<p>{{ event.instructor.display_name }}</p>
			    	</div>
			    </div>
			</div>

			<div>
				<h4 class="font-bold text-heading">{{ t("Headings.Name") }}</h4>
				<p>{{ event.title ?? "---" }}</p>
			</div>

			<div>
				<h4 class="font-bold text-heading">{{ t("Headings.Description") }}</h4>
				<p>{{ event.description ?? "---" }}</p>
			</div>

			<div>
				<p class="flex flex-wrap space-x-2 items-center">
					<span>{{ t('Headings.Skill') }}</span>
					<RouterLink v-if="parentSkill?.id" :to="`/skill-tree/${parentSkill.id}`"
						class="font-bold text-accent">{{ parentSkillName }}</RouterLink>
				    <p v-if="subSkill?.id && parentSkill?.id">></p>
				    <RouterLink v-if="subSkill?.id && parentSkill?.id" :to="`/skill-tree/${parentSkill.id}/${subSkill.id}`"
					    class="font-bold text-accent">{{ subSkillName }}</RouterLink>
				</p>
				
				<p v-for="(stat, i) of stats" :key="i">
					{{ t(stat.heading) }}
					<span class="font-bold text-heading">{{ stat.value }}</span>
				</p>
				
				<p v-if="event.link">
					Link
					<a :href="event.link" class="font-bold text-accent" target="_blank">link</a>
				</p>
				
				<p v-if="event.admin_link">
					Admin-Link
					<a :href="event.admin_link" class="font-bold text-accent" target="_blank">link</a>
				</p>
			</div>
		</div>
		<div class="h-4" />
		<slot />
	</div>
</template>

<script setup lang="ts">
import type { WebinarEvent, CoachingEvent } from "~/types/calenderTypes";
import { InformationCircleIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";
const props = defineProps<{
	event: WebinarEvent | CoachingEvent;
	description: string;
	stats: { heading: string; value: string; icon: string }[];
}>();

defineEmits<{
	(e: "cancel"): void;
}>();

const { t } = useI18n();

onMounted(async () => {
  await getRootSkillTree();
  await getSubSkillTree(parentSkill.value?.id ?? "");
});
const skillTree = useRootSkillTree();
const subTree = useSubSkillTree();

watch(
  () => props.event.id,
  async () => {
  	await getRootSkillTree();
  	await getSubSkillTree(parentSkill.value?.id ?? "");
  }
);

const parentSkill = computed(() => {
  return skillTree.value.skills.find((skill) =>
  	skill.skills.includes(props.event.skill_id)
  );
});
const subSkill = computed(() => {
  return subTree.value.skills.find(
  	(skill) => skill.id == props.event.skill_id
  );
});

const parentSkillName = computed(() => {
  return parentSkill.value?.name ?? "";
});
const subSkillName = computed(() => {
  return subSkill.value?.name;
});
</script>

<style scoped></style>
