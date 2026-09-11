export type PurchaseOffer = {
  id: string;
  hash: string;
  text: string;
  declaration: string;
  recipient: string;
  expires_at: string;
  user_id: string;
  source: string;
  product: { kind: string; reference: string; coins: number; title: string };
};
type SavedPurchase = { owner: string; orderId: string };
const scope = (offer: PurchaseOffer) =>
  offer.source === "paypal"
    ? "paypal:coins"
    : offer.product.kind.startsWith("premium_")
      ? "backend:premium"
      : `${offer.source}:${offer.product.kind}:${offer.product.reference}`;
const recoveryKey = (owner: string, product: string) => `purchase-checkout:${owner}:${product}`;
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
/** The PayPal composable has durably saved its original provider identity. */
export function handoffPurchaseRecovery(offer: PurchaseOffer) {
  const owner = useUser().value?.id;
  if (owner !== offer.user_id || offer.source !== "paypal") return;
  if (readRecovery(owner, scope(offer))?.orderId === offer.id)
    localStorage.removeItem(recoveryKey(owner, scope(offer)));
}
export function purchaseAcceptance(offer: PurchaseOffer) {
  return {
    order_id: offer.id,
    offer_hash: offer.hash,
    accepted: true,
    early_performance_requested: true,
  };
}
export async function requestPurchaseOffer(path: string): Promise<PurchaseOffer | null> {
  try {
    const owner = useUser().value?.id;
    const product = pathScope(path);
    // Events owns closure/rebooking authority. Its offer endpoint recovers an
    // open reservation and permits a new quote only after the original closes.
    const sourceReservation = product?.startsWith("events:");
    if (owner && product && !sourceReservation) {
      const original = await recover(owner, product);
      if (original?.state === "offered") {
        if (Date.parse(original.offer.expires_at) > Date.now()) return original.offer;
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
  } catch {
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
export async function acceptPurchase(offer: PurchaseOffer) {
  try {
    const result = await withPurchaseRecovery(offer, () =>
      (POST as (url: string, body: unknown) => Promise<any>)(
        "/shop/purchases/accept",
        purchaseAcceptance(offer)
      )
    );
    finishPurchaseRecovery(offer, result);
    await Promise.all([getBalance(), getHearts(), getPremiumStatus()]);
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
