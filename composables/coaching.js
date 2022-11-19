import { useState } from '#app';

export const useCoachings = () => useState('coachings', () => []);

export async function getCoachingsForThisSubSkill(subSkillID) {
	try {
		const response = await GET(`/events/coachings/${subSkillID}`);

		const coachings = useCoachings();
		coachings.value = response ?? [];

		if (coachings.value.length > 0) {
			coachings.value = coachings.value.sort(function (x, y) {
				return x.start - y.start;
			});
		}

		return [coachings.value, null];
	} catch (error) {
		return [null, error.data];
	}
}

export async function bookCoachingsForThisSubSkillWithThisInstructor(
	subSkillID,
	instructorID
) {
	try {
		if (!!!subSkillID) {
			throw { data: 'Invalid sub skill ID' };
		}

		if (!!!instructorID) {
			throw { data: 'Invalid instructor ID' };
		}

		const response = await POST(
			`/events/coachings/${subSkillID}/${instructorID}`
		);

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}
