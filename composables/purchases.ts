import { decodeApiError } from "~/utils/apiError";

/** One line of an offer's order summary. The dialog highlights `product`, `term` and `price`. */
export type OfferLine = { role: string; text: string };
/** The lines of an order summary in one language and the request for an early start. */
export type OfferWording = { lines: OfferLine[]; declaration: string };

export type PurchaseOffer = {
  id: string;
  hash: string;
  text: string;
  declaration: string;
  recipient: string;
  expires_at: string;
  user_id: string;
  source: string;
  product: {
    kind: string;
    reference: string;
    coins: number;
    title: string;
    facts?: Record<string, unknown>;
  };
  /**
   * The order summary line by line, in the agreed German wording and in English. Offers
   * of Morphcoins, Premium and hearts have it; older offers and those of other services
   * do not, and their dialog shows the full offer text instead.
   */
  summary?: { de: OfferWording; en: OfferWording };
  /**
   * `"button"`: an offer of stage 2 (terms 2026-10). The order button accepts it with its
   * terms and withdrawal policy; a box remains only for its `declaration`, which only a
   * Premium period beginning within the withdrawal period carries. Older offers have none
   * and keep their acceptance box and declaration box.
   */
  acceptance?: "button";
};

/**
 * Whether the order button alone accepts `offer` (stage 2). Only an offer whose summary the
 * dialog can show is one: without it the dialog shows the offer text with both boxes, and then
 * both are needed, whatever the offer says.
 */
export const buttonAccepts = (offer: PurchaseOffer | null | undefined) =>
  offer?.acceptance === "button" && offerWording(offer, "de") !== null;

/** The interface locale (`de`, `en-US`) of an offer wording's language (`de`, `en`); empty for none. */
export const offerLocale = (language: string) =>
  language === "en" ? "en-US" : language === "de" ? "de" : "";

/** What the page says when the order button is pressed before the boxes are ticked. */
export const consentMissingKey = (offer: PurchaseOffer | null | undefined) =>
  buttonAccepts(offer) ? "Error.EarlyStartMissing" : "Error.WithdrawalConsentMissing";

const wordingValid = (wording: any): wording is OfferWording =>
  typeof wording?.declaration === "string" &&
  Array.isArray(wording.lines) &&
  wording.lines.length > 0 &&
  wording.lines.every(
    (line: any) => typeof line?.role === "string" && typeof line?.text === "string"
  );

/**
 * The order summary of an offer in the language of the interface: English where the
 * interface is English, otherwise the German wording, which is the agreed one. Only a
 * summary whose German lines are exactly the offer text and whose German declaration is
 * the offer's own is used, so the dialog never shows a wording other than the one agreed;
 * anything else returns `null` and the dialog shows the offer text itself.
 */
export function offerWording(
  offer: PurchaseOffer | null | undefined,
  locale: string
): (OfferWording & { lang: "de" | "en" }) | null {
  const summary = offer?.summary;
  if (!summary || !wordingValid(summary.de)) return null;
  if (summary.de.lines.map((line) => line.text).join("\n") !== offer.text) return null;
  if (summary.de.declaration !== offer.declaration) return null;
  if (locale.startsWith("en") && wordingValid(summary.en))
    return { lang: "en", lines: summary.en.lines, declaration: summary.en.declaration };
  return { lang: "de", lines: summary.de.lines, declaration: summary.de.declaration };
}
type SavedPurchase = { owner: string; orderId: string };
const scope = (offer: PurchaseOffer) =>
  offer.source === "paypal"
    ? "paypal:coins"
    : offer.product.kind.startsWith("premium_")
      ? "backend:premium"
      : `${offer.source}:${offer.product.kind}:${offer.product.reference}`;
const recoveryKey = (owner: string, product: string) => `purchase-checkout:${owner}:${product}`;
/** The server checks expiry inside the accepting transaction, so only a request that
 * started before expiry can still commit. Waiting this long after expiry lets such a
 * commit, whose response this browser lost, become visible before the identity is
 * removed; it also absorbs moderate clock skew. */
const ACCEPTANCE_SETTLE_MS = 10 * 60 * 1000;
const settledExpired = (offer: PurchaseOffer | undefined) => {
  const expires = Date.parse(offer?.expires_at ?? "");
  return Number.isFinite(expires) && expires + ACCEPTANCE_SETTLE_MS <= Date.now();
};
/** A quote is valid for 20 minutes. A dialog opened again within its first half shows
 * the same quote instead of asking for another one; with less time left a new quote
 * leaves the buyer the full time to read and accept it. The margin also absorbs clock
 * skew between this browser and the server. */
const OFFER_REUSE_MIN_REMAINING_MS = 10 * 60 * 1000;
/** Quotes the backend issues for its own products. Only these are reused: accepting one
 * compares it with the current catalog and rejects a changed quote without a charge. */
const reusableKind = (path: string) =>
  path.match(/^\/shop\/purchases\/offers\/(hearts|premium_monthly|premium_yearly)$/)?.[1] ?? null;
/** The newest quote of this owner for this product that nobody has accepted yet and that
 * still has enough time left, from the order list the backend keeps. Only a quote with its
 * own summary is taken up again: one issued before the short order summary would be
 * shown long and then refused on acceptance. `fits` lets the caller refuse a quote whose
 * agreed quantity no longer matches the account. Any failure of the lookup leads to a new
 * quote. */
async function openOffer(
  owner: string,
  path: string,
  fits?: (offer: PurchaseOffer) => boolean
): Promise<PurchaseOffer | null> {
  const kind = reusableKind(path);
  if (!kind) return null;
  let list: unknown;
  try {
    list = await GET("/shop/purchases");
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const now = Date.now();
  const open = list
    .filter(
      (status: any) =>
        status?.state === "offered" &&
        status.offer?.user_id === owner &&
        status.offer.source === "backend" &&
        status.offer.product?.kind === kind &&
        Date.parse(status.offer.expires_at) - now >= OFFER_REUSE_MIN_REMAINING_MS &&
        offerWording(status.offer, "de") !== null &&
        (!fits || fits(status.offer))
    )
    .map((status: any) => status.offer as PurchaseOffer)
    .sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at));
  return open[0] ?? null;
}
function pathScope(path: string): string | null {
  if (/^\/shop\/coins\/paypal\/offers\/\d+$/.test(path)) return "paypal:coins";
  if (/^\/shop\/purchases\/offers\/premium_(monthly|yearly)$/.test(path)) return "backend:premium";
  if (path === "/shop/purchases/offers/hearts") return "backend:hearts:hearts";
  const course = path.match(/^\/skills\/course_access\/([^/]+)\/offer$/);
  if (course) return `skills:course:${course[1]}`;
  const webinar = path.match(/^\/events\/webinars\/([^/]+)\/offer$/);
  if (webinar) return `events:webinar:${webinar[1]}`;
  const coaching = path.match(/^\/events\/coachings\/[^/]+\/([^/]+)\/offer$/);
  return coaching ? `events:coaching:${coaching[1]}` : null;
}
function readRecovery(owner: string, product: string): SavedPurchase | null {
  const raw = localStorage.getItem(recoveryKey(owner, product));
  if (!raw) return null;
  const saved = JSON.parse(raw);
  if (saved.owner !== owner || !/^[0-9a-f-]{36}$/i.test(saved.orderId))
    throw new Error("Saved order cannot be verified");
  return saved;
}
async function recover(owner: string, product: string): Promise<any | null> {
  const saved = readRecovery(owner, product);
  if (!saved) return null;
  const status = await GET(`/shop/purchases/${saved.orderId}`);
  if (useUser().value?.id !== owner || status?.offer?.user_id !== owner)
    throw new Error("Purchase owner changed");
  if (scope(status.offer) !== product) throw new Error("Saved order does not match product");
  return status;
}
/** Save only owner/order identity before dispatch. The server serializes first
 * acceptances too, including absent storage and quotes opened in different tabs. */
export async function withPurchaseRecovery<T>(offer: PurchaseOffer, action: () => Promise<T>) {
  const owner = useUser().value?.id;
  if (!owner || offer.user_id !== owner) throw new Error("Purchase owner changed");
  const product = scope(offer);
  const key = recoveryKey(owner, product);
  const run = async () => {
    if (useUser().value?.id !== owner) throw new Error("Purchase owner changed");
    const previous = await recover(owner, product);
    if (previous && previous.offer.id !== offer.id && previous.state !== "failed") {
      await navigateTo("/orders");
      throw new Error("Recover the original order first");
    }
    localStorage.setItem(key, JSON.stringify({ owner, orderId: offer.id }));
    const result = await action();
    if (useUser().value?.id !== owner) throw new Error("Purchase owner changed");
    return result;
  };
  return navigator.locks ? navigator.locks.request(key, run) : run();
}
export function finishPurchaseRecovery(offer: PurchaseOffer, status: any) {
  const owner = useUser().value?.id;
  if (owner !== offer.user_id || !["fulfilled", "failed"].includes(status?.state)) return;
  const key = recoveryKey(owner, scope(offer));
  if (readRecovery(owner, scope(offer))?.orderId === offer.id) localStorage.removeItem(key);
}
/** Final states are stable. An expired offered row may predate another tab's
 * acceptance, so wait out the settle time and reread it under the checkout lock
 * before removing its identity. */
export async function cleanupPurchaseRecovery(status: any) {
  const offer: PurchaseOffer = status?.offer;
  const owner = useUser().value?.id;
  if (!owner || offer?.user_id !== owner || !offer?.id || !offer?.product?.kind) return;
  const terminal = ["fulfilled", "failed"].includes(status.state);
  const expired = status.state === "offered" && settledExpired(offer);
  if (!terminal && !expired) return;
  const key = recoveryKey(owner, scope(offer));
  const clean = async () => {
    if (useUser().value?.id !== owner) return;
    if (readRecovery(owner, scope(offer))?.orderId !== offer.id) return;
    if (expired) {
      // Without cross-tab coordination, preserve a possibly in-flight acceptance.
      if (!navigator.locks) return;
      const fresh = await recover(owner, scope(offer));
      if (
        fresh?.offer?.id !== offer.id ||
        (!["fulfilled", "failed"].includes(fresh.state) &&
          !(fresh.state === "offered" && settledExpired(fresh.offer)))
      )
        return;
    }
    if (useUser().value?.id !== owner) return;
    if (readRecovery(owner, scope(offer))?.orderId === offer.id) localStorage.removeItem(key);
  };
  try {
    if (navigator.locks) await navigator.locks.request(key, clean);
    else await clean();
  } catch {
    /* Unreadable/unavailable recovery stays protected. */
  }
}
/** The PayPal composable has durably saved its original provider identity. */
export function handoffPurchaseRecovery(offer: PurchaseOffer) {
  const owner = useUser().value?.id;
  if (owner !== offer.user_id || offer.source !== "paypal") return;
  if (readRecovery(owner, scope(offer))?.orderId === offer.id)
    localStorage.removeItem(recoveryKey(owner, scope(offer)));
}
/**
 * The server refused to take `offer` as the basis of a payment (409): the quote is stale,
 * for instance issued before a change of the catalog. If the server still has it unaccepted
 * or failed, nothing was ordered, and its recovery identity is dropped so that the next
 * request brings a new quote. Any other state keeps the identity and its way to the orders.
 * Returns whether the quote was dropped.
 */
export async function discardStaleOffer(offer: PurchaseOffer): Promise<boolean> {
  const owner = useUser().value?.id;
  if (!owner || offer.user_id !== owner) return false;
  let status: any;
  try {
    status = await GET(`/shop/purchases/${offer.id}`);
  } catch {
    return false;
  }
  if (useUser().value?.id !== owner || status?.offer?.id !== offer.id) return false;
  if (!["offered", "failed"].includes(status.state)) return false;
  const product = scope(offer);
  try {
    if (readRecovery(owner, product)?.orderId === offer.id)
      localStorage.removeItem(recoveryKey(owner, product));
  } catch {
    return false;
  }
  return true;
}
/**
 * The acceptance of `offer` as the dialog gives it. The order button only works once the
 * boxes are ticked, so it states the early start whenever the offer asks for it: every
 * paid offer of stage 1, and of stage 2 only one with a declaration. For a declaration the
 * dialog shows from the offer's summary, in stage 1 and stage 2 alike, it also names the
 * language it was shown in on the interface of `locale`, so that the confirmation repeats it
 * as it was ticked, next to the binding German wording. An offer without a summary (other
 * services, older offers) shows its German text, and its acceptance stays as it was.
 */
export function purchaseAcceptance(offer: PurchaseOffer, locale = "de") {
  const early = !buttonAccepts(offer) || offer.declaration !== "";
  const acceptance = {
    order_id: offer.id,
    offer_hash: offer.hash,
    accepted: true,
    early_performance_requested: early,
  };
  const shown = early && offer.declaration !== "" ? offerWording(offer, locale)?.lang : undefined;
  return shown ? { ...acceptance, declaration_language: shown } : acceptance;
}
/** The quote for one product: an accepted original first, then a still open quote of
 * the backend (see `openOffer`), otherwise a new one. `fits` applies to an open original
 * too: one left by an acceptance without an answer that no longer fits the account (its
 * renewal or quantity changed since) would state something untrue. The server still has it
 * open, so nothing was ordered on it; its recovery entry is dropped and a new quote takes
 * its place. */
export async function requestPurchaseOffer(
  path: string,
  fits?: (offer: PurchaseOffer) => boolean
): Promise<PurchaseOffer | null> {
  try {
    const owner = useUser().value?.id;
    const product = pathScope(path);
    // Events owns closure/rebooking authority. Its offer endpoint recovers an
    // open reservation and permits a new quote only after the original closes.
    const sourceReservation = product?.startsWith("events:");
    if (owner && product && !sourceReservation) {
      const original = await recover(owner, product);
      if (original?.state === "offered") {
        if (Date.parse(original.offer.expires_at) > Date.now() && (!fits || fits(original.offer)))
          return original.offer;
        localStorage.removeItem(recoveryKey(owner, product));
      }
      if (product === "paypal:coins" && original?.state === "awaiting_payment")
        return original.offer;
      if (original?.state === "failed") {
        localStorage.removeItem(recoveryKey(owner, product));
      } else if (original && original.state !== "offered") {
        if (original.state === "fulfilled") localStorage.removeItem(recoveryKey(owner, product));
        await navigateTo("/orders");
        return null;
      }
    }
    if (owner) {
      const open = await openOffer(owner, path, fits);
      if (open) return useUser().value?.id === owner ? open : null;
    }
    const result = await POST(path);
    if (owner && useUser().value?.id !== owner) return null;
    if (!result?.offer?.id || result.state !== "offered") {
      await navigateTo("/orders");
      return null;
    }
    if (owner && product && sourceReservation) {
      const original = readRecovery(owner, product);
      if (original && original.orderId !== result.offer.id)
        localStorage.removeItem(recoveryKey(owner, product));
    }
    return result.offer;
  } catch (error: any) {
    // The server makes no offer before the e-mail address is confirmed. A page
    // that did not know (an old tab) leads to the confirmation and back here.
    if (decodeApiError(error).messageKey === "Error.AccountNotVerified") {
      await navigateTo(emailVerificationRoute(useRouter().currentRoute.value.fullPath));
      return null;
    }
    const owner = useUser().value?.id;
    const product = pathScope(path);
    if (owner && product?.startsWith("events:")) {
      // A reserved slot can cease to be quotable before the source lookup.
      // Keep the original claim reachable; a rejected quote never clears it.
      try {
        if (readRecovery(owner, product)) await navigateTo("/orders");
      } catch {
        /* An unreadable marker also remains untouched. */
      }
    }
    openSnackbar("error", "Body.PurchaseOfferUnavailable");
    return null;
  }
}
/** `PurchaseStatus.refusal` of an order the server refused without a charge because its quote
 * expired or no longer matches the product or the account; a new quote can be asked for. */
const OFFER_CHANGED = "offer_changed";
/**
 * Accepts `offer`. Returns `true` when the order has an outcome (the dialog closes), `false`
 * when the outcome is unknown (the dialog and the recovery entry stay), and `"renew"` when the
 * server refused the quote as changed: nothing was ordered or charged, and the caller shows a
 * new quote in its place. That includes a quote issued before terms 2026-10 took effect and
 * accepted from then on. `locale` is the language of the interface the dialog is shown in.
 */
export async function acceptPurchase(
  offer: PurchaseOffer,
  locale = "de"
): Promise<boolean | "renew"> {
  try {
    const result = await withPurchaseRecovery(offer, () =>
      (POST as (url: string, body: unknown) => Promise<any>)(
        "/shop/purchases/accept",
        purchaseAcceptance(offer, locale)
      )
    );
    finishPurchaseRecovery(offer, result);
    await Promise.all([getBalance(), getHearts(), getPremiumStatus()]);
    if (result.state === "failed" && result.refusal === OFFER_CHANGED) return "renew";
    // A refill refused because the hearts filled up in the meantime (the free refill, another
    // tab): there is nothing left to buy, so the dialog closes and the learner stays. The
    // hearts were just read again.
    if (
      result.state === "failed" &&
      offer.product.kind === "hearts" &&
      Number((useHeartInfo().value as any)?.hearts) >= useHeartConfig().value.hearts_max
    ) {
      openSnackbar("info", "Error.AlreadyHaveHearts");
      return true;
    }
    openSnackbar(
      result.state === "fulfilled" ? "success" : "info",
      result.state === "fulfilled"
        ? "Body.PurchaseProvided"
        : result.state === "failed"
          ? "Body.PurchaseRejected"
          : "Body.PurchasePending"
    );
    if (result.state !== "fulfilled") await navigateTo("/orders");
    return true;
  } catch {
    openSnackbar("info", "Body.PurchaseUncertain");
    return false;
  }
}
export async function downloadPurchaseDocument(id: string, kind: string) {
  const user = useUser();
  const owner = user.value?.id;
  if (!owner) return;
  let current = true;
  const stop = watch(
    () => user.value?.id,
    () => {
      current = false;
    },
    { flush: "sync" }
  );
  try {
    const data = await GET(`/shop/purchases/${id}/documents/${kind}`);
    if (!current || user.value?.id !== owner) return;
    const blob =
      data instanceof Blob ? data : new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-${kind}.${kind === "terms" || kind === "withdrawal" ? "pdf" : "txt"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    if (current && user.value?.id === owner)
      openSnackbar("error", "Body.PurchaseDocumentUnavailable");
  } finally {
    stop();
  }
}
