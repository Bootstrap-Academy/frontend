import { useState } from '#app';

export const useCalendar = () => useState('calendar', () => null);
export const useICS = () => useState('ics', () => '');
export const useEvents = () => useState('events', () => []);
export const useEventFilter = () => useState('eventFilter', () => 'all');

export async function getCalendar() {
	try {
		const response = await GET(`/events/calendar`);

		const calendar = useCalendar();
		calendar.value = response ?? null;

		const ics = useICS();
		const config = useRuntimeConfig();
		ics.value = `${config.BASE_API_URL}/events/calendar/${
			response?.ics_token ?? ''
		}/academy.ics`;

		const events = useEvents();
		events.value = response?.events ?? [];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function cancelCalendarEvent(id: string) {
	try {
		if (!!!id) {
			throw { data: 'Invalid event ID' };
		}

		const response = await DELETE(`/events/calendar/${id}`);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
