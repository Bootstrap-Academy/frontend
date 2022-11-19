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
	} catch (error) {
		return [null, error.data];
	}
}

export async function getMyWebinars() {
	try {
		const response = await GET(`/events/webinars?booked_only=true`);

		const myWebinars = useMyWebinars();
		myWebinars.value = response ?? [];

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}

export async function getWebinarsForThisSubSkill(subSkillID) {
	try {
		if (!!!subSkillID) {
			throw { data: 'Invalid sub skill ID' };
		}

		const response = await GET(`/events/webinars?skill_id=${subSkillID}`);

		const webinars = useWebinars();
		webinars.value = response ?? [];

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}

export async function getAllWebinars() {
	try {
		const response = await GET(`/events/webinars`);

		const webinars = useWebinars();
		webinars.value = response ?? [];

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}

export async function registerForWebinarByID(webinarID) {
	try {
		if (!!!webinarID) {
			throw { data: 'Invalid webinar ID' };
		}

		const response = await POST(`/events/webinars/${webinarID}/participants`);

		return [response, null];
	} catch (error) {
		return [null, error.data];
	}
}
