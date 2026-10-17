/**
 * The day a new version of the legal texts takes effect.
 *
 * It is configured as one ISO timestamp with an explicit offset, and it has to be the start of
 * a calendar day in Germany (00:00 Europe/Berlin). Then the day the text names ("gilt ab dem
 * 9. Dezember 2026") and the moment the site switches to the new version are the same day.
 *
 * This file is read while the site is built (`nuxt.config.ts`) and by the backend script that
 * renders the PDFs of the same texts (`scripts/render-purchase-documents.py` in the backend
 * repository), which repeats the rules below. Both must write the same date for the same
 * timestamp, so the date is put together here from the calendar day in Berlin and fixed month
 * names, and not from the locale data of whatever runtime formats it.
 */

const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

/** Whether the date part names a day of the calendar: `Date` turns 30 February into 2 March. */
function calendarDay(value: string) {
  const [, year, month, day] = value.match(ISO_TIMESTAMP)?.map(Number) ?? [];
  if (!year || !month || !day) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const berlin = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/** The calendar day and the time of day of a moment in Berlin. */
function inBerlin(date: Date) {
  const parts = Object.fromEntries(
    berlin.formatToParts(date).map((part) => [part.type, Number(part.value)])
  );
  return parts as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/**
 * The configured start, or `null` while none is set. Anything else than an empty value or the
 * start of a day in Berlin as an ISO timestamp with an offset is refused.
 */
export function parseEffectiveStart(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!calendarDay(value) || Number.isNaN(date.getTime()))
    throw new Error(
      `Effective date "${value}" is not an ISO timestamp with an offset, such as 2026-12-09T00:00:00+01:00`
    );
  const time = inBerlin(date);
  if (time.hour || time.minute || time.second || date.getUTCMilliseconds())
    throw new Error(`Effective date "${value}" is not 00:00 in Europe/Berlin`);
  return date;
}

/** "9. Dezember 2026": the date as the German texts name it. */
export function germanDate(date: Date) {
  const { day, month, year } = inBerlin(date);
  return `${day}. ${MONTHS_DE[month - 1]} ${year}`;
}

/** "9 December 2026": the date as the English translation names it. */
export function englishDate(date: Date) {
  const { day, month, year } = inBerlin(date);
  return `${day} ${MONTHS_EN[month - 1]} ${year}`;
}
