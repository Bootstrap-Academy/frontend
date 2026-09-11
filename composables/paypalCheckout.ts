import { useEventListener } from "@vueuse/core";

type Checkout = {
  owner: string;
  orderId: string;
  coins: number;
  phase: "approval" | "pending" | "complete";
};

const storageKey = (owner: string) => `paypal-checkout:${owner}`;

/** Only order identity and display amount are cached; the authenticated capture
 * endpoint remains authoritative about ownership and committed fulfillment. */
export function usePaypalCheckout() {
  const user = useUser();
  const coinsBalance = useCoins();
  const stored = useState<Checkout | null>("paypalCheckout", () => null);
  const busy = useState("paypalCheckoutBusy", () => false);
  const storageError = useState("paypalCheckoutError", () => "");
  const coordinationUnavailable = useState("paypalCheckoutCoordinationUnavailable", () => false);
  const error = computed(() =>
    coordinationUnavailable.value ? "PaypalRecovery.BrowserError" : storageError.value
  );
  const checkout = computed(() => (stored.value?.owner === user.value?.id ? stored.value : null));

  function read(owner: string): Checkout | null {
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      value.owner !== owner ||
      typeof value.orderId !== "string" ||
      !/^[A-Za-z0-9-]{1,128}$/.test(value.orderId) ||
      !Number.isSafeInteger(value.coins) ||
      value.coins <= 0 ||
      !["approval", "pending", "complete"].includes(value.phase)
    )
      throw new Error("Invalid saved checkout");
    return value;
  }

  function restore() {
    // Hydrating an order must not erase a browser capability failure when another
    // checkout component mounts. Recheck on reentry so a supported browser recovers.
    coordinationUnavailable.value = !navigator.locks;
    stored.value = null;
    storageError.value = "";
    if (!user.value?.id) return;
    try {
      stored.value = read(user.value.id);
    } catch {
      // Never erase an unreadable saved order or silently enable another purchase.
      storageError.value = "PaypalRecovery.StorageError";
    }
  }

  watch(() => user.value?.id, restore, { immediate: true });
  useEventListener(window, "storage", (event) => {
    if (event.key === storageKey(user.value?.id ?? "") || event.key === null) restore();
  });

  function save(value: Checkout) {
    localStorage.setItem(storageKey(value.owner), JSON.stringify(value));
    if (user.value?.id === value.owner) stored.value = value;
  }

  async function locked<T>(owner: string, action: () => T | Promise<T>): Promise<T> {
    coordinationUnavailable.value = !navigator.locks;
    if (coordinationUnavailable.value) {
      throw new Error("Safe checkout coordination is unavailable");
    }
    return navigator.locks.request(storageKey(owner), action);
  }

  async function create(
    coins: number,
    body: string,
    actionIsCurrent: () => boolean = () => true
  ): Promise<string> {
    const owner = user.value?.id;
    if (!owner || busy.value || error.value || !actionIsCurrent())
      throw new Error("Checkout unavailable");
    const start = async () => {
      // Acquiring the cross-tab lock is another asynchronous boundary. Do not
      // dispatch an old action under a changed owner, offer or declaration.
      if (user.value?.id !== owner || !actionIsCurrent())
        throw new Error("Checkout action changed");
      const existing = read(owner);
      if (existing) {
        if (user.value?.id === owner) stored.value = existing;
        if (existing.phase === "approval") return existing.orderId;
        throw new Error("Resolve the existing payment first");
      }
      // Refuse to start when recovery identity cannot be saved in this browser.
      localStorage.setItem(`${storageKey(owner)}:probe`, "1");
      localStorage.removeItem(`${storageKey(owner)}:probe`);
      const [orderId, failure] = await createPaypalOrder(body);
      if (typeof orderId !== "string") throw new Error(failure?.detail ?? "Unable to create order");
      try {
        save({ owner, orderId, coins, phase: "approval" });
      } catch {
        // Do not hand an unsaved order to the SDK for approval.
        if (user.value?.id === owner) storageError.value = "PaypalRecovery.StorageError";
        throw new Error("Unable to save checkout");
      }
      return orderId;
    };
    busy.value = true;
    try {
      // Serialize new-order callbacks across tabs as well as within this page.
      return await locked(owner, start);
    } finally {
      busy.value = false;
    }
  }

  async function capture(orderId: string) {
    const owner = user.value?.id;
    if (!owner || busy.value) return;
    busy.value = true;
    try {
      await locked(owner, async () => {
        const current = read(owner);
        if (!current || current.orderId !== orderId || current.phase === "complete") return;
        // Persist before sending: a lost HTTP response is an unresolved payment too.
        save({ ...current, phase: "pending" });
        const [result] = await onApproveCapturePaypalOrder(orderId);
        if (result && Number.isSafeInteger(result.coins)) {
          save({ ...current, phase: "complete" });
          if (user.value?.id === owner) coinsBalance.value = result.coins;
        }
        // Every non-success (including 503, network loss, 404, auth failure and
        // expired provider evidence) retains the order. None proves nonpayment.
      });
    } catch {
      if (user.value?.id === owner) storageError.value = "PaypalRecovery.StorageError";
    } finally {
      busy.value = false;
    }
  }

  async function dismiss(orderId: string, phase: "approval" | "complete") {
    const owner = user.value?.id;
    if (!owner) return;
    try {
      await locked(owner, () => {
        const current = read(owner);
        // Late cancellation, including in another tab, cannot erase capture.
        if (current?.orderId !== orderId || current.phase !== phase) return;
        localStorage.removeItem(storageKey(owner));
        if (user.value?.id === owner) stored.value = null;
      });
    } catch {
      if (user.value?.id === owner) storageError.value = "PaypalRecovery.StorageError";
    }
  }

  return { checkout, busy, error, coordinationUnavailable, create, capture, dismiss };
}

let paypalSdk: Promise<any> | undefined;
export function loadPaypalSdk(clientId: string): Promise<any> {
  if (!paypalSdk) {
    paypalSdk = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.setAttribute("data-namespace", "paypal_sdk");
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR`;
      script.addEventListener("load", () => resolve((window as any).paypal_sdk));
      script.addEventListener("error", () => {
        script.remove();
        paypalSdk = undefined;
        reject(new Error("Unable to load PayPal"));
      });
      document.body.appendChild(script);
    });
  }
  return paypalSdk;
}
