import { Ref } from 'nuxt/dist/app/compat/capi';
import { description } from '~~/description';

export const useChallengesLoginUrl = () =>
	useState('challengesLoginUrl', () => '');

export const useMyChallengesStats: () => Ref<any> = () =>
	useState('myChallengesStats', () => null);

export const useChallengesCategories: () => Ref<any[]> = () =>
	useState('challengesCategories', () => []);

export const useChallenges: () => Ref<any[]> = () =>
	useState('challenges', () => []);

export const useChallenge: () => Ref<any> = () =>
	useState('challenge', () => null);

export async function getMyChallengesStats() {
	try {
		const response = await GET('/auth/sessions/challenges/login_url');
		// const response = await GET('/challenges/categories');

		const myChallengesStats = useMyChallengesStats();
		// myChallengesStats.value = response ?? '';
		myChallengesStats.value = {
			rank: 3,
			score: {
				current: 350,
				total: 500,
			},
			challenges: {
				total: 35,
				solved: 1,
				incorrect: 1,
				untried: 4,
				unlocked: 4,
				locked: 29,
			},
			categories: {
				completed: 4,
				total: 7,
			},
		};

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getChallengesCategories() {
	try {
		// const response = await GET('/challenges/categories');
		const response = await GET('/auth/sessions/challenges/login_url');

		const challengesCategories = useChallengesCategories();
		challengesCategories.value = [
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f01',
				title: 'Introduction Challenges',
				points: {
					total: 50,
					current: 34,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f02',
				title: 'Easy',
				points: {
					total: 100,
					current: 40,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f03',
				title: 'Medium',
				points: {
					total: 200,
					current: 100,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f04',
				title: 'Hard',
				points: {
					total: 50,
					current: 35,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f05',
				title: 'Reverse Challenges',
				points: {
					total: 100,
					current: 80,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f06',
				title: 'Optimization Challenges',
				points: {
					total: 50,
					current: 15,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f07',
				title: 'Refactoring Challenges',
				points: {
					total: 50,
					current: 15,
				},
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
		];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getChallengesByCategory(categoryID: string) {
	try {
		// const response = await GET('/challenges/categories');
		const response = await getChallengesCategories();

		const challengesCategories = useChallengesCategories();
		const challenges = useChallenges();
		challenges.value = [
			{
				id: '197f6eca-6276-4993-bfeb-53cbbbba6f01',
				category: '497f6eca-6276-4993-bfeb-53cbbbba6f01',
				title: 'Hello World!',
				description: description,
				creator: '1dccd4a6-75d2-43aa-a088-76d941f1b60a',
				created: '2019-08-24T14:15:22Z',
				start: '2019-08-24T14:15:22Z',
				end: '2019-08-24T14:15:22Z',
				skills: [],
				limits: [
					'Time limit: 1 second',
					'Memory limit: 256 MB',
					'Maximum 50 Submissions (50 left)',
					'Maximum submission size: 5000 bytes',
				],
				tasks: [
					{
						name: 'Exponential',
						description: '$$ n ≤ 20 $$',
						score: {
							current: 0,
							total: 5,
						},
						attempts: 0,
						solvedOnFirstTry: false,
						solved: true,
						correct: true,
					},
				],
				examples: [
					{
						heading: '',
						input:
							'```JAVASCRIPT \nlet a = "hello world" \nconsole.log(a) \n```',
						output: '```sh \n"hello world" \n ```',
					},
					{
						heading: 'My New Example',
						input:
							'```JAVASCRIPT \nlet a = "hello world" \nconsole.log(a)\n```',
						output: '```sh \n"hello world"\n ```',
					},
				],
			},
			{
				id: '197f6eca-6276-4993-bfeb-53cbbbba6f02',
				category: '497f6eca-6276-4993-bfeb-53cbbbba6f01',
				title: 'Input',
				description: description,
				creator: '1dccd4a6-75d2-43aa-a088-76d941f1b60a',
				creation_timestamp: '2019-08-24T14:15:22Z',
				skills: [],
				tasks: [
					{
						name: 'Exponential',
						description: `\`\`\`sh
						n ≤ 20
						\`\`\``,
						score: {
							current: 0,
							total: 5,
						},
						attempts: 0,
						solvedOnFirstTry: false,
						solved: false,
						correct: false,
					},
					{
						name: 'Linear',
						description: 'n ≤ 10^5',
						score: {
							current: 5,
							total: 20,
						},
						attempts: 3,
						solvedOnFirstTry: false,
						solved: true,
						correct: false,
					},
				],
				examples: [
					{
						input: '```JAVASCRIPT \nlet a = "hello world" console.log(a)\n ```',
						output: '```sh \n"hello world"\n ```',
						explanation: `4 + 5 = 9`,
					},
				],
			},
		];

		return [challenges.value, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getChallenge(categoryID: string, challengeID: string) {
	try {
		const response = await getChallengesByCategory(categoryID);

		const challenges = useChallenges();
		const challenge = useChallenge();
		challenge.value = challenges.value.find((c) => c.id == challengeID);

		return [challenge.value, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getChallengesLoginUrl() {
	try {
		const response = await GET('/auth/sessions/challenges/login_url');

		const challengesLoginUrl = useChallengesLoginUrl();
		challengesLoginUrl.value = response ?? '';

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
