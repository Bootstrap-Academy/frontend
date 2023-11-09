import { useState } from '#app';
import { WebinarEvent,CoachingEvent, Calendar} from '~/types/calenderTypes';

export const useCalendar = () => useState<Calendar>('calendar', () => new Calendar());
export const useICS = () => useState('ics', () => '');
export const useEvents = () => useState<(WebinarEvent | CoachingEvent)[]>('events', () => []);
export const useEventFilter = () => useState('eventFilter', () => 'all');

export async function getCalendar() {
  try {
    const response :Calendar= await GET(`/events/calendar`);

    const calendar = useCalendar();
    calendar.value = response ?? null;

    const ics = useICS();
    const config = useRuntimeConfig().public;
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
    getCalendar()
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }

}
