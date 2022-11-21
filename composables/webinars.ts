import { useState } from '#app';

export const useMyWebinars = () => useState('myWebinars', () => []);
export const useWebinars = () => useState('webinars', () => []);
export const useCalendarICS = () => useState('calendarICS', () => '');

export async function getCalendarICS() {
	try {
		const response = await GET(`/events/calendar`);

		const calendarICS = useCalendarICS();
		calendarICS.value = response ?? '';

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

export async function getMyWebinars() {
	const user = <any>useUser();
	let user_id = user?.value?.id ?? null;

	try {
		if (!!!user_id) {
			throw { data: { detail: 'Invalid User Id' } };
		}

		const response = await GET(`/events/webinars?creator=${user_id}`);

		const myWebinars = useMyWebinars();
		myWebinars.value = response ?? [];

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

		const response = await GET(`/events/webinars?skill_id=${subSkillID}`);

		const webinars = useWebinars();
		webinars.value = response ?? [];

		return [response, null];
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

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
