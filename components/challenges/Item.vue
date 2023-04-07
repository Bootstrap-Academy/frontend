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

		<div v-if="showChallengeContent">
			<ChallengesItemDescription :data="data" />
		</div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { TrophyIcon } from '@heroicons/vue/24/outline';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		activeCategory: { type: String, default: '' },
	},
	components: { TrophyIcon },
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

		function toggleShowChallengeContent() {
			router.replace({
				path: route.path,
				query: showChallengeContent.value
					? {
							category: props.activeCategory,
					  }
					: {
							category: props.activeCategory,
							challenge: challenge.value,
					  },
			});
		}

		return { t, showChallengeContent, toggleShowChallengeContent };
	},
});
</script>

<style scoped></style>
