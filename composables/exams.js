import { useState } from '#app';

export const useExams = () => useState('exams', () => []);

export async function getExamsForThisSubSkill(subSkillID) {
	try {
		const response = await GET(`/events/exams/${subSkillID}`);

		const exams = useExams();
		exams.value = response ?? [];

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}

export async function bookExamsForThisSubSkill(subSkillID) {
	try {
		if (!!!subSkillID) {
			throw { data: 'Invalid sub skill ID' };
		}

		const response = await POST(`/events/exams/${subSkillID}`);

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}
