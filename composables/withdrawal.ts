/**
 * The declarations a consumer has to give before a paid order can be placed so
 * that the right of withdrawal expires early (§ 356 Abs. 5 Nr. 2 / Abs. 6
 * Nr. 2 BGB).
 *
 * The wording is fixed by the withdrawal instruction on
 * `/docs/right-of-withdrawal`; part A applies to services (premium, webinars,
 * coachings), part B to digital content (Morphcoins, courses, hearts). Both
 * the version below and the declarations themselves have to be changed
 * together with that page.
 */

/** Version of the withdrawal instruction the declarations are taken from. */
export const WITHDRAWAL_TEXT_VERSION = "2026-09";

/** Which part of the withdrawal instruction applies to an order. */
export type WithdrawalKind = "service" | "digital";

/** Purchases the declarations are recorded for. */
export type WithdrawalSubject = "coins" | "premium" | "hearts" | "course" | "webinar" | "coaching";

/** Body every order request carries once the declarations have been given. */
export function withdrawalConsentBody() {
  return {
    withdrawal_consent: true,
    withdrawal_text_version: WITHDRAWAL_TEXT_VERSION,
  };
}

/**
 * Record the declarations for an order that is placed against one of the other
 * services (course unlock, webinar and coaching bookings). Those services do
 * not store the declarations themselves, so they are recorded here first and
 * the order is only placed if that succeeded.
 */
export async function recordWithdrawalConsent(subject: WithdrawalSubject, reference?: string) {
  try {
    const response = await POST(`/shop/consents`, {
      subject,
      reference: reference || null,
      ...withdrawalConsentBody(),
    });

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
