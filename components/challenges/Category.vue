<template>
	<section>
		<header
			class="flex gap-card justify-between cursor-pointer"
			@click="toggleShowChallenges()"
		>
			<div>
				<h2 class="text-heading-2">{{ data?.title ?? '' }}</h2>
				<p>{{ data?.description ?? '' }}</p>
			</div>

			<p>{{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}</p>
		</header>

		<NuxtLink :to="`/challenges/${data?.id ?? ''}/create`" v-if="canCreate">
			<Btn :icon="PlusIcon" class="mt-box" sm>
				{{ t('Buttons.AddChallenge') }}
			</Btn>
		</NuxtLink>

		<div class="grid gap-box grid-cols-1 pt-box" v-show="showChallenges">
			<ChallengesItem
				v-for="challenge of challenges"
				:key="challenge.id"
				:data="challenge"
				:mine="mine"
			/>
		</div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, TrophyIcon } from '@heroicons/vue/24/outline';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		mine: { type: Boolean, default: false },
	},
	components: { TrophyIcon, PlusIcon },
	setup(props) {
		const { t } = useI18n();

		const challenges: any[] = reactive([]);

		const loading = ref(challenges.length <= 0);

		onMounted(async () => {
			const [success, error] = await getChallengesByCategory(
				props.data?.id ?? ''
			);
			loading.value = false;

			Object.assign(challenges, success ? success : []);
		});

		const router = useRouter();
		const route = useRoute();

		const category = computed(() => {
			return props.data?.id ?? '';
		});

		const activeCategory = computed(() => {
			return (route.query?.category ?? '').toString();
		});

		const showChallenges = computed(() => {
			return activeCategory.value == category.value;
		});

		const canCreate = computed(() => {
			let currentPoints = props.data?.points?.current ?? 0;
			return currentPoints >= 100;
		});

		function toggleShowChallenges() {
			router.replace({
				path: route.path,
				query: showChallenges.value
					? {}
					: {
							category: category.value,
					  },
			});
		}

		return {
			t,
			loading,
			challenges,
			showChallenges,
			toggleShowChallenges,
			canCreate,
			PlusIcon,
		};
	},
});
</script>

<style scoped></style>
