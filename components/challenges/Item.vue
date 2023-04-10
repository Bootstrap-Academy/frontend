<template>
	<section class="box px-4 xl:px-5 style-box bg-secondary">
		<header
			class="flex gap-card justify-between cursor-pointer"
			@click="toggleShowChallengeContent"
		>
			<h2 class="!m-0 text-heading-3">{{ t(data?.title ?? '') }}</h2>
			<p class="!m-0 flex-shrink-0">
				{{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}
			</p>
		</header>

		<div
			v-if="showChallengeContent"
			class="grid gap-card grid-cols-1 pt-card-sm"
		>
			<Btn class="w-fit" :icon="CodeBracketIcon">{{ t('Buttons.Solve') }}</Btn>
			<ChallengesItemDescription :data="data" />
			<ChallengesItemLimits :data="data" />
			<ChallengesItemDuration :data="data" />
			<ChallengesItemTasks :data="data" />
			<ChallengesItemExamples :data="data" />
		</div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { CodeBracketIcon, TrophyIcon } from '@heroicons/vue/24/outline';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	components: { TrophyIcon, CodeBracketIcon },
	setup(props) {
		const { t } = useI18n();

		const router = useRouter();
		const route = useRoute();

		const challenge = computed(() => {
			return props.data?.id ?? '';
		});

		const activeChallenge = computed(() => {
			return route.query?.challenge ?? '';
		});

		const showChallengeContent = computed(() => {
			return activeChallenge.value == challenge.value;
		});

		const baseQuery = computed(() => {
			return {
				category: route.query?.category ?? '',
			};
		});

		function toggleShowChallengeContent() {
			router.replace({
				path: route.path,
				query: showChallengeContent.value
					? {
							...baseQuery.value,
					  }
					: {
							...baseQuery.value,
							challenge: challenge.value,
					  },
			});
		}

		return {
			t,
			showChallengeContent,
			toggleShowChallengeContent,
			CodeBracketIcon,
		};
	},
});
</script>

<style scoped></style>
