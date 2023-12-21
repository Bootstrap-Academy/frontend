!
<template>
	<div
		class="style-card bg-secondary w-full max-w-3xl relative overflow-y-scroll max-h-full p-10"
	>
		<Btn sm secondary class="relative -top-5 -left-5" @click="$emit('cancel')"
			>Zurück</Btn
		>

		<div class="w-full flex content-center items-center gap-2">
			<component
				:is="InformationCircleIcon"
				class="h-10 w-10 row-span-2 md:row-span-3"
				:class="'fill-info'"
			/>
			<h6 class="text-heading-2 text-heading font-heading">
				<h6>{{ t("Headings.Summary") }}</h6>
			</h6>
		</div>
		<hr class="mt-card text-transparent" />
		<!-- ? Instructor below -->
		<div class="h-full max-h-3xl">
			<div class="flex flex-col">
				<div>
					<h4 class="font-bold text-heading">
						{{ t("Headings.Instructor") }}
					</h4>
					<Rating :rating="event.instructor_rating ?? 0" sm stars />
					<div class="flex gap-2">
						<img
							:src="event.instructor.avatar_url ?? '/images/about-2.webp'"
							class="w-6 h-6 object-cover rounded-[50px]"
							alt=""
						/>
						<p>{{ event.instructor.display_name }}</p>
					</div>
					<hr class="mt-card text-transparent" />
				</div>
				<div>
					<h4 class="font-bold text-heading">
						{{ t("Headings.Name") }}
					</h4>
					<p>{{ event.title }}</p>
				</div>
			</div>

			<hr class="mt-card text-transparent" />

			<h4 class="font-bold text-heading">
				{{ t("Headings.Description") }}
			</h4>
			<p>{{ description }}</p>
			<hr class="mt-card text-transparent" />

			<div>
				<p>
					Name <span class="font-bold text-heading">{{ event.title }}</span>
				</p>
				<p v-if="parentSkill?.id">
					{{t('Headings.ParentSkill')}} <RouterLink :to="`/skill-tree/${parentSkill.id}`" class="font-bold text-accent">{{ parentSkillName }}</RouterLink>
				</p>
				<p v-if="subSkill?.id && parentSkill?.id">
					{{t('Headings.Skill')}} <RouterLink :to="`/skill-tree/${parentSkill.id}/${subSkill.id}`" class="font-bold text-accent">{{ subSkillName }}</RouterLink>
				</p>
				<p v-for="(stat, i) of stats" :key="i">
					{{ t(stat.heading) }}
					<span class="font-bold text-heading">
						{{ stat.value }}
					</span>
				</p>
				<p v-if="event.link">
					Link
					<a :href="event.link" class="font-bold text-accent" target="_blank">
						link
					</a>
				</p>
				<p v-if="event.admin_link">
					Admin-Link
					<a
						:href="event.admin_link"
						class="font-bold text-accent"
						target="_blank"
						>link</a
					>
				</p>
				<p
					v-if="
						event.hasOwnProperty('participants') &&
						event.hasOwnProperty('max_participants')
					"
				>
					{{ t("Headings.Participants") }}
					<span class="font-bold text-heading">
						<!-- ? not possible to check instanceOf props.event -->
						{{ event.participants }}/{{ event.max_participants }}
					</span>
				</p>
				<p v-if="event.hasOwnProperty('creation_date')">
					{{ t("Headings.CreationDate") }}
					<span class="font-bold text-heading">
						<!-- ? not possible to check instanceOf props.event -->
						{{ getTimeAndDate(event.creation_date).date }}
						{{ getTimeAndDate(event.creation_date).time }}
					</span>
				</p>
			</div>
			<hr class="mt-card mb-card" />
		</div>

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

function getTimeAndDate(timestamp: number) {
  if (timestamp == -1) {
    return { time: ``, date: `` };
  }

  let { date, month, year } = convertTimestampToDate(timestamp);
  let time = new Date(timestamp * 1000).toTimeString();
  let [hr, min, sec] = time.split(":");

  return {
    time: `${hr}:${min}`,
    date: `${date} ${t(month.string).slice(0, 3)}, ${year}`,
  };
}

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
