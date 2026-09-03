# Consumer UI

Three pieces of the interface exist because consumer law requires them. They are
easy to break by accident, so this note records where they live and what has to
be kept true.

## Terms gate

`components/TermsGate.vue`, `composables/terms.ts`

The version of the terms and conditions the platform currently asks for is the
constant `TERMS_VERSION` in `composables/terms.ts`. Signup sends it with the
account (`POST /auth/users`), and `needsTermsAcceptance()` compares it against
the `terms_version` on the profile that `GET /auth/users/me` returns. Accounts
created before the acceptance was recorded have no `terms_version` at all and
are asked as well.

The gate is rendered from `app.vue` into the slot of whichever layout is
active, so it reaches every route except the prefixes in
`TERMS_GATE_EXEMPT_PREFIXES` (`/docs`, so the linked documents stay readable,
and `/account`, so the account can be deleted instead of accepting).

It offers two actions and nothing else closes it — there is no backdrop or
escape handler:

- **Accept** calls `POST /auth/users/me/terms` with `TERMS_VERSION` and
  `age_confirmed`, then reloads the profile.
- **Decide later** calls `POST /auth/users/me/terms/decline`, which records the
  refusal server-side, and hides the modal for the rest of the app session.

The dismissal is a Nuxt `useState`, not a cookie and not local storage, so the
gate returns on the next app start while the accepted version still differs.
Nothing about the decision is kept on the client.

**When a new version of `/docs/terms-and-conditions` is published, bump
`TERMS_VERSION`.** Everyone is then asked again.

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
