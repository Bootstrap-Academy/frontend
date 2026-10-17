/**
 * The moment terms 2026-10 are announced: the day the mail goes out. From then until the terms
 * take effect, accounts see a notice on the platform (`components/TermsNotice.vue`).
 *
 * It is configured as one ISO timestamp with an explicit offset. This file is read while the
 * site is built (`nuxt.config.ts`), so a value that cannot work stops the build.
 */

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

/**
 * The configured announcement, or `null` while none is set. It needs the start of terms 2026-10
 * and has to lie before it.
 */
export function parseAnnouncement(value: string, effective: Date | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!ISO_TIMESTAMP.test(value) || Number.isNaN(date.getTime()))
    throw new Error(
      `Announcement "${value}" is not an ISO timestamp with an offset, such as 2026-10-21T09:00:00+02:00`
    );
  if (!effective)
    throw new Error(
      "An announcement needs the start of terms 2026-10 (NUXT_PUBLIC_TERMS_2026_10_FROM)"
    );
  if (date.getTime() >= effective.getTime())
    throw new Error(`Announcement "${value}" does not lie before the start of terms 2026-10`);
  return date;
}
