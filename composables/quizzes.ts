import { useState } from '#app';

export const useQuizzes = () => useState<any[]>('quizzes', () => []);
export const useQuiz = () => useState<any>('quiz', () => null);

export async function getQuiz(id: string) {
	try {
		// const response = await GET(`/quizzes/quizzes/${id}`);

		// const quiz = useQuiz();
		// quiz.value = response ?? null;

		// return [response, null];

		await getQuizzes();
		const quizzes = useQuizzes();
		const quiz = useQuiz();
		quiz.value = quizzes.value.find((q) => q.id == id);
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getQuizzes() {
	try {
		// const response = await GET('/quizzes/quizzes');

		// const quizzes = useQuizzes();
		// quizzes.value = response ?? [];

		// return [response, null];

		await sleep(3000);
		const quizzes = useQuizzes();
		quizzes.value = [
			{
				id: '2342344234',
				question: 'What is Vue?',
				type: 'multi-choice',
				price: 0,
				options: [
					{
						answer: 'Framework',
						correct: false,
					},
					{
						answer: 'Node JS',
						correct: false,
					},
					{
						answer: 'Library',
						correct: true,
					},
				],
			},
			{
				id: 'fnhiuhriu4nvr',
				question: 'Which is the powerhouse of cell?',
				type: 'multi-choice',
				price: 1,
				options: [
					{
						answer: 'Mitochondria',
						correct: true,
					},
					{
						answer: 'Plasma',
						correct: false,
					},
					{
						answer: 'Brain',
						correct: false,
					},
				],
			},
		];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getFilteredQuizzes(filters: any[]) {
	try {
		let query = '';

		for (let key in filters) {
			if (typeof filters[key] == 'object' && filters[key].length > 0) {
				filters[key].forEach((item: any) => {
					query = query + `${key}=${item}&`;
				});
			} else if (typeof filters[key] == 'boolean' && filters[key] == true) {
				query = query + `${key}=${filters[key]}&`;
			} else if (
				typeof filters[key] == 'string' &&
				!!filters[key] &&
				filters[key] != '---'
			) {
				query = query + `${key}=${filters[key]}&`;
			} else if (typeof filters[key] == 'number' && filters[key] != -1) {
				query = query + `${key}=${filters[key]}&`;
			}
		}

		// const response = await GET(`/skills/courses?${query}`);
		await getQuizzes();
		const quizzes = useQuizzes();
		const response = quizzes.value;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
