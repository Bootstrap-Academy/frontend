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
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f02',
				title: 'Easy',
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f03',
				title: 'Medium',
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f04',
				title: 'Hard',
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f05',
				title: 'Reverse Challenges',
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f06',
				title: 'Optimization Challenges',
				description:
					'Simple introductory challenges to familiarize yourself with this platform',
			},
			{
				id: '497f6eca-6276-4993-bfeb-53cbbbba6f07',
				title: 'Refactoring Challenges',
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
				description:
					'most challenges, the goal is not only to write a program that produces a certain output for a given input, but also to make this program as efficient as possible. Only a limited time is available for the execution of the program (see below). If the program is not finished after this time limit (in this introduction challenge one second), the corresponding test case and thus the subtask is considered as failed. In this challenge, the task is to calculate the sum of the first ***n*** natural numbers for a given natural number ***n***. A possible solution for this is to iterate over the first ***n*** natural numbers, adding them together. However, the execution time of this solution is proportional to ***n***, which becomes problematic in the second sub-task, since up to two billion numbers would have to be added, which would take an extremely long time. A better solution here would be, for example, the Gaussian summation formula $$sum_{k=1}^{n}k=\\frac{n(n+1)}{2}$$ , which can be used to calculate the sum of the first ***n*** natural numbers in constant time. **Note**: When implementing the Gaussian summation formula, it is essential to make sure that you exclusively use integers and not floats in your calculations, since the latter are too imprecise for the numbers relevant in Task 2. A frequently occurring problem, especially in Python, is that dividing by 2 results in a float at the end, which is unfortunately too inaccurate. Instead of dividing by 2 using the `/` operator (float division) and then converting the float into an integer, the `//` operator (integer division) can be used, which directly returns an integer when dividing, whereby no precision should be lost. ### Input: - Line 1: The number ***n*** ### Output: - Line 1: The sum of the first ***n*** natural numbers $$sum_{k=1}^{n}k$$',
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
					},
					{
						name: 'Linear',
						description: 'n ≤ 10^5',
						score: {
							current: 5,
							total: 20,
						},
						attempts: 3,
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
