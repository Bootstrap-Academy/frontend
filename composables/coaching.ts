import { useState } from '#app';

export const useCoachings = () => useState('coachings', () => []);

export async function getCoachingsForThisSubSkill(subSkillID: string) {
  try {
    if (!!!subSkillID) {
      throw { data: { detail: 'Invalid sub skill ID' } };
    }

    const response = await GET(
      `/events/calendar?type=coaching&skill_id=${subSkillID}`
    );

    const coachings = useCoachings();
    coachings.value = response?.events ?? [];

    if (coachings.value.length > 0) {
      coachings.value = coachings.value.sort(function (x, y) {
        return x.start - y.start;
      });
    }

    return [coachings.value, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function bookCoachingForThisSubSkillWithThisInstructor(
  subSkillID: string,
  slot_id: string
) {
  try {
    if (!!!subSkillID) {
      throw { data: { detail: 'Invalid sub skill ID' } };
    }

    if (!!!slot_id) {
      throw { data: { detail: 'Invalid instructor ID' } };
    }

    const response = await POST(`/events/coachings/${subSkillID}/${slot_id}`);
    await getBalance();
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
