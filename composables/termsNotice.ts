import { englishDate, germanDate, parseEffectiveStart } from "../utils/legalEffectiveDate";
import { parseAnnouncement } from "../utils/termsAnnouncement";
import type { UpdateNoticeWindow } from "./updateNotice";

/**
 * The notice of terms 2026-10 on the platform (part 2 of the announcement). It runs from the
 * announcement (`NUXT_PUBLIC_TERMS_2026_10_ANNOUNCED`) until the terms take effect
 * (`NUXT_PUBLIC_TERMS_2026_10_FROM`) and uses the dismissal of `updateNotice.ts`: once closed,
 * it stays closed for that account in this browser.
 */
export const TERMS_NOTICE_VERSION = "2026-10-terms";
export const TERMS_NOTICE_TERMS = "/docs/terms-and-conditions-2026-10";
export const TERMS_NOTICE_WITHDRAWAL = "/docs/right-of-withdrawal-2026-10";
/** The English translation inside the withdrawal instructions 2026-10. */
export const TERMS_NOTICE_WITHDRAWAL_EN = `${TERMS_NOTICE_WITHDRAWAL}#english`;

/** The window and the date the notice names, or `null` while either moment is unset. */
export function termsNotice(config: {
  TERMS_2026_10_FROM?: unknown;
  TERMS_2026_10_ANNOUNCED?: unknown;
}): { window: UpdateNoticeWindow; date: string; dateEn: string } | null {
  const from = parseEffectiveStart(String(config.TERMS_2026_10_FROM || ""));
  const announced = parseAnnouncement(String(config.TERMS_2026_10_ANNOUNCED || ""), from);
  if (!from || !announced) return null;
  return {
    window: {
      version: TERMS_NOTICE_VERSION,
      startsAt: announced.getTime(),
      expiresAt: from.getTime(),
    },
    date: germanDate(from),
    dateEn: englishDate(from),
  };
}

/**
 * The pages someone comes to with a goal: buying (the amount page and the two pages with an
 * order form in the page itself) and learning (quiz, matching, challenge, lesson, the learning
 * room and the guest lesson). The notice stays off them; overview and course pages carry it.
 */
const PURCHASE_PAGES = ["/morphcoins/buy", "/morphcoins/paypal", "/subscription"];
const LEARNING_PAGES = [
  /^\/quizzes\/(solve|skill)-[^/]+$/,
  /^\/matchings\/solve-[^/]+$/,
  /^\/challenges\/quizcodingchallenge-[^/]+$/,
  /^\/challenges\/[^/]+\/(?!create$)[^/]+$/,
  /^\/courses\/[^/]+\/(lessons\/[^/]+|watch)$/,
  /^\/(learn|start)$/,
];
export function isGoalRoute(path: string) {
  const pathname = (path.split(/[?#]/, 1)[0] ?? "").toLowerCase().replace(/\/+$/, "");
  return (
    PURCHASE_PAGES.includes(pathname) || LEARNING_PAGES.some((pattern) => pattern.test(pathname))
  );
}
