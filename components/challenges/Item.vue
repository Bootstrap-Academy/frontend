<template>
	<section class="box px-4 xl:px-5 style-box bg-secondary">
		<header
			class="grid gap-card grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] cursor-pointer"
			@click="toggleShowChallengeContent"
		>
			<h2 class="!m-0 text-heading-3">
				{{ t(data?.title ?? '') }}
			</h2>

			<ChallengesItemProgress :data="data" />

			<p class="!m-0 text-right">
				{{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}
			</p>
		</header>

		<div
			v-show="showChallengeContent"
			class="grid gap-card grid-cols-1 pt-card-sm"
		>
			<div class="flex gap-card">
				<NuxtLink :to="to">
					<Btn class="w-fit" :icon="CodeBracketIcon">
						{{ t('Buttons.Solve') }}
					</Btn>
				</NuxtLink>
				<NuxtLink :to="editTo" v-if="mine">
					<Btn secondary class="w-fit" :icon="PencilIcon">
						{{ t('Buttons.EditChallenge') }}
					</Btn>
				</NuxtLink>
			</div>
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
import { PencilIcon } from '@heroicons/vue/24/solid';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		mine: { type: Boolean, default: false },
	},
	components: { TrophyIcon, CodeBracketIcon, PencilIcon },
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

		const to = computed(() => {
			return `/challenges/${baseQuery.value.category}/${activeChallenge.value}`;
		});
		const editTo = computed(() => {
			return `/challenges/edit-${activeChallenge.value}`;
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
			to,
			PencilIcon,
			editTo,
		};
	},
});
</script>

<style scoped></style>
