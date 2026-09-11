# Consumer UI

Three pieces of the interface exist because consumer law requires them. They are
easy to break by accident, so this note records where they live and what has to
be kept true.

## Prospective acceptance and update notice

`components/TermsGate.vue` and `composables/terms.ts` retain the legacy gate
implementation, but `app.vue` does not mount it. Signing in with an older
accepted terms version neither blocks access nor submits a terms decision.
Signup explicitly accepts the current `TERMS_VERSION`; a new order has its own
explicit declarations and stored documents. Publishing a new version does not
by itself change an existing account's acceptance.

`components/UpdateNotice.vue` is an informational, dismissible card mounted once
client-side by `app.vue`. It appears only after a signed-in profile is loaded,
and stays hidden on public legal, declaration, and retained-access routes. Its
links and close button do not call a consent or terms endpoint. It does not
capture focus, block navigation, or prevent use of the page.

`composables/updateNotice.ts` uses a separate `UPDATE_NOTICE_VERSION`. Only an
explicit dismissal writes the value `1` to Local Storage under
`bootstrap-academy:update-notice:<notice-version>:<user-UUID>`. Displaying the
notice, signing in, and switching accounts never write a marker. A matching
dismissal from another tab also hides the current notice. Logout and account
switches invalidate old close actions without adopting another user's marker.

The App owns the in-memory dismissal set and supplies it to each notice child,
so a default/inner layout change can remount the child without losing dismissal.
If Local Storage is unavailable, dismissal lasts for this mounted application,
including navigation away and back. It can reappear after a reload; browser
data deletion, another browser, or a new notice version can also show it again.
There is no server-side or cross-device dismissal state, and no consent record.

## Order summary and withdrawal declarations

`components/order/Summary.vue`, `components/order/WithdrawalConsent.vue`,
`composables/withdrawal.ts`

`OrderSummary` is the block that has to be shown immediately before a paid
order: the essential characteristics of what is bought, the total price with
the net and VAT breakdown, links to the terms and to the withdrawal
instruction, and the order button. Its `submitLabel` defaults to
`Buttons.OrderWithObligationToPay` — override it only where nothing has to be
paid.

`OrderWithdrawalConsent` goes into the `consent` slot, directly above the
button. It renders the two declarations the consumer gives so that the right of
withdrawal expires early, taken verbatim from `/docs/right-of-withdrawal`:
`kind="service"` for premium, webinars and coachings, `kind="digital"` for
Morphcoins, courses and hearts. Both boxes start unticked and the order button
stays disabled until both are ticked. The wording is German in both locales,
because the contract language is German.

All five order surfaces use both components:

| Surface                    | File                                   | Kind      |
| -------------------------- | -------------------------------------- | --------- |
| Morphcoin purchase         | `pages/morphcoins/paypal.vue`          | `digital` |
| Premium membership         | `pages/subscription/index.vue`         | `service` |
| Heart refill               | `components/user/RefillHeartBtn.vue`   | `digital` |
| Course unlock              | `components/course/Overview.vue`       | `digital` |
| Webinar / coaching booking | `components/calendar/EventBooking.vue` | `service` |

How the declarations reach the server depends on who completes the purchase:

- The backend completes the Morphcoin purchase, the premium order and the heart
  refill. Those requests carry `withdrawalConsentBody()` (`withdrawal_consent`
  and `withdrawal_text_version`) and are rejected without it.
- A microservice completes the course unlock and the event bookings.
  `recordWithdrawalConsent(subject, reference)` posts the declarations to
  `POST /shop/consents` first, and the order is only placed if that succeeded.

**When `/docs/right-of-withdrawal` changes, change the declarations and
`WITHDRAWAL_TEXT_VERSION` together.**

## Cancellation and withdrawal bar

`components/ContractTermination.vue`

The two buttons have to be permanently available, so the bar is rendered from
`app.vue` and from `error.vue` into the layout slot and appears on every route.
It links to `/vertrag-kuendigen` and `/vertrag-widerrufen`; both pages work
without an account and post to `POST /contracts/cancellations` and
`POST /contracts/withdrawals` (see `composables/contracts.ts`).

The bar is hidden while printing (`print:hidden`), because the printed sheet has
to show the declaration record only. The same two links also appear in the
footer, but the bar is what makes them permanent — do not remove it from
`app.vue`.

## Prospective terms version 2026-09-r2

The application does not automatically prompt existing accounts to change their terms. The global TermsGate mount is absent; its legacy component/helpers are retained without changing stored acceptance or deferral fields. New registrations explicitly accept r2. New purchase and renewal offers use the r2 terms PDF with the unchanged r1 withdrawal PDF; the new manifest identifies each document version. Historical r1 terms remain accessible at `/docs/terms-and-conditions-2026-09-r1`. Publication alone does not amend existing contracts, revive renewal or change saved offers/receipts.
