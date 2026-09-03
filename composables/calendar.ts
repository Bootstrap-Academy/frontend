import { useState } from "#app";
import { WebinarEvent, CoachingEvent, Calendar } from "~/types/calenderTypes";

export const useCalendar = () => useState<Calendar>("calendar", () => new Calendar());
export const useICS = () => useState("ics", () => "");
export const useEvents = () => useState<(WebinarEvent | CoachingEvent)[]>("events", () => []);
export const useEventFilter = () => useState("eventFilter", () => "all");

/**
 * The subscription url of the ics feed. The token in it is a bearer credential
 * that is stored per user and can be replaced with `rotateIcsToken()`.
 */
function icsUrl(token: string) {
  const config = useRuntimeConfig().public;
  return token ? `${config.BASE_API_URL}/events/calendar/${token}/academy.ics` : "";
}

export async function getCalendar() {
  try {
    const response: Calendar = await GET(`/events/calendar`);

    const calendar = useCalendar();
    calendar.value = response ?? null;

    const ics = useICS();
    ics.value = icsUrl(response?.ics_token ?? "");

    const events = useEvents();
    events.value = response?.events ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function rotateIcsToken() {
  try {
    const response: { ics_token: string } = await POST(`/events/calendar/token/rotate`);

    const calendar = useCalendar();
    if (calendar.value) {
      calendar.value.ics_token = response?.ics_token ?? "";
    }

    const ics = useICS();
    ics.value = icsUrl(response?.ics_token ?? "");

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function cancelCalendarEvent(id: string) {
  try {
    if (!!!id) {
      throw { data: "Invalid event ID" };
    }

    const response = await DELETE(`/events/calendar/${id}`);
    getCalendar();
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
