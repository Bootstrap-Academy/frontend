<template>
	<div class="w-screen h-fit lg:h-screen-main container-fluid mt-main mb-main">
		<Head>
			<Title>Skill Details - {{ skillName }}</Title>
		</Head>

		<header class="flex gap-box flex-wrap items-center mb-container">
			<NuxtLink to="/skill-tree">Root Skill tree /</NuxtLink>
			<NuxtLink :to="`/skill-tree/${rootSkillID}`">
				{{ subTreeName }} /
			</NuxtLink>
			<h1 class="text-heading-2 capitalize">{{ skillName }}</h1>
		</header>

		<section
			class="grid grid-rows-[auto_auto_auto)auto] lg:grid-rows-1 grid-cols-1 lg:grid-cols-3 justify-items-center lg:place-items-center gap-10 md:gap-container"
		>
			<SkillTreeNodeDetailsStepper
				:activeStepper="activeStepper"
				@activeStepper="activeStepper = $event"
			/>

			<div>
				<SkillTreeNodeSvg
					:size="nodeSize"
					:node="subSkill"
					:active="true"
					:completed="subSkill?.completed ?? false"
				/>
				<h6
					class="text-heading-4 lg:text-heading-3 xl:text-heading-2 text-center mt-card-sm"
				>
					{{ subSkill?.name ?? '' }}
				</h6>
			</div>

			<SkillTreeNodeDetailsStepperContent
				:activeStepper="activeStepper"
				:courses="courses"
				:coachings="coachings"
				:webinars="webinars"
				:subSkillID="subSkillID"
			/>
		</section>
	</div>
</template>

<script lang="ts">
import { defineComponent, Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
	middleware: ['auth'],
});

export default defineComponent({
	head: {
		title: 'Sub Skill Details',
	},
	setup() {
		const { t } = useI18n();

		const activeStepper = ref(0);

		const skillTree: Ref<any> = useSkillTree();

		const courses = useCourses();
		const coachings = useCoachings();
		const webinars = useWebinars();

		const route = useRoute();

		const rootSkillID = computed(() => {
			return <string>(route?.params?.id ?? '');
		});

		const subTreeName = computed(() => {
			return rootSkillID.value.replace(/_/g, ' ');
		});

		const subSkillID = computed(() => {
			return <string>(route?.params?.skill ?? '');
		});

		const skillName = computed(() => {
			return subSkillID.value.replace(/_/g, ' ');
		});

		const subSkill = computed(() => {
			let skills: any[] = skillTree.value?.skills ?? [];
			return skills.find((skill) => skill.id == subSkillID.value);
		});

		const courseIDs = computed(() => {
			return subSkill.value?.courses ?? [];
		});

		const loading = ref(true);

		const windowWidth = ref(process.client && window ? window.innerWidth : 0);

		function updateWindowWidth() {
			windowWidth.value = window?.innerWidth ?? 0;
		}

		const nodeSize = computed(() => {
			if (windowWidth.value >= 1440) {
				return 300;
			} else if (windowWidth.value >= 1024 && windowWidth.value < 1440) {
				return 250;
			} else if (windowWidth.value >= 524 && windowWidth.value < 1024) {
				return 200;
			} else {
				return 150;
			}
		});

		onMounted(async () => {
			if (window) {
				windowWidth.value = window?.innerWidth ?? 0;
				window.addEventListener('resize', updateWindowWidth);
			}

			courses.value = [];

			const [success, error] = await getSkillTree(rootSkillID.value);

			if (!!success) {
				await Promise.all([
					getTheseCourses(courseIDs.value),
					getCoachingsForThisSubSkill(subSkillID.value),
					getWebinarsForThisSubSkill(subSkillID.value),
				]);
			}

			loading.value = false;
		});

		onUnmounted(() => {
			if (window) {
				window.removeEventListener('resize', updateWindowWidth);
			}
		});

		return {
			t,
			activeStepper,
			loading,
			courses,
			coachings,
			webinars,
			subSkill,
			nodeSize,
			rootSkillID,
			subTreeName,
			subSkillID,
			skillName,
		};
	},
});
</script>

<style scoped></style>
