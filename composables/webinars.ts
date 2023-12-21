import { useState } from '#app';

export const useMyWebinars = () => useState('myWebinars', () => []);
export const useWebinars = () => useState('webinars', () => []);
export const useWebinar = () => useState('webinar', () => null);

export async function getRating(skill_id: string) {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: { detail: 'Invalid User Id' } };
    }
    if (!!!skill_id) {
      throw { data: { detail: 'Invalid Skill Id' } };
    }
    const response = await GET(`/events/ratings/${user_id}/${skill_id}`);

    return [response == null ? 0 : response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function deleteWebinar(id: string) {
  try {
    if (!!!id) {
      throw { data: { detail: 'Invalid webinar Id' } };
    }

    const response = await DELETE(`/events/calendar/${id}`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getWebinar(id: string) {
  try {
    if (!!!id) {
      throw { data: { detail: 'Invalid webinar Id' } };
    }

    const response = await GET(`/events/webinars/${id}`);

    const webinar = useWebinar();
    webinar.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function createWebinar(body: any) {
  try {
    const response = await POST(`/events/webinars`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function editWebinar(id: string, body: any) {
  try {
    if (!!!id) {
      throw { data: { detail: 'Invalid webinar Id' } };
    }

    const response = await PATCH(`/events/webinars/${id}`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getMyWebinars() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: { detail: 'Invalid User Id' } };
    }

    const response = await GET(`/events/calendar?type=webinar&instructor_id=${user_id}`);

    const myWebinars = useMyWebinars();
    myWebinars.value = response?.events ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getWebinarsForThisSubSkill(subSkillID: string) {
  try {
    if (!!!subSkillID) {
      throw { data: { detail: 'Invalid sub skill ID' } };
    }

    const response = await GET(
      `/events/calendar?type=webinar&skill_id=${subSkillID}`
    );
    const webinars = useWebinars();
    webinars.value = response?.events ?? [];

    return [webinars.value, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getAllWebinars() {
  try {
    const response = await GET(`/events/webinars`);

    const webinars = useWebinars();
    webinars.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function registerForWebinarByID(webinarID: string) {
  try {
    if (!!!webinarID) {
      throw { data: 'Invalid webinar ID' };
    }

    const response = await POST(`/events/webinars/${webinarID}/participants`);
    await getBalance();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
