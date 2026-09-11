export const usePremiumInfo = () => useState("premiumInfo", () => null);
export const usePremiumStatusKnown = () => useState("premiumStatusKnown", () => false);
const usePremiumStatusRevision = () => useState("premiumStatusRevision", () => 0);

export const usePremiumPlans = () => useState<Record<string, any>>("premiumPlans", () => ({}));

export async function getPremiumPlans() {
  try {
    const res = await GET(`/shop/premium_plans`);
    const premiumPlans = usePremiumPlans();
    premiumPlans.value = res ?? {};
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

/** Price of a premium plan in Morphcoins, falling back to the configured default. */
export function premiumPlanPrice(plans: Record<string, any>, plan: "MONTHLY" | "YEARLY") {
  const price = Number(plans?.[plan]?.price);
  return Number.isFinite(price) && price > 0 ? price : PREMIUM_PRICE_FALLBACK[plan];
}
export async function getPremiumStatus() {
  const premiumInfo = usePremiumInfo();
  const known = usePremiumStatusKnown();
  const revision = usePremiumStatusRevision();
  const requestRevision = ++revision.value;
  try {
    const user: any = useUser();
    const res = await GET(`/shop/premium/${user.value.id}`);
    if (
      !res ||
      typeof res.premium !== "boolean" ||
      ![null, "MONTHLY", "YEARLY"].includes(res.autopay)
    ) {
      throw new Error("Invalid premium status");
    }
    // A read started before a newer read or mutation must not restore old state.
    if (requestRevision === revision.value) {
      premiumInfo.value = res;
      known.value = true;
    }
    return [res, null];
  } catch (error: any) {
    if (requestRevision === revision.value) known.value = false;
    return [null, error];
  }
}

export async function buyPremium(body: any) {
  const premiumInfo = usePremiumInfo();
  const known = usePremiumStatusKnown();
  const revision = usePremiumStatusRevision();
  try {
    const res = await POST(`/shop/premium`, body);
    // The purchase response already contains the committed premium status.
    ++revision.value;
    premiumInfo.value = res;
    known.value = true;
    await getBalance();
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function updatePremiumAutoPay(body: any) {
  const known = usePremiumStatusKnown();
  const revision = usePremiumStatusRevision();
  ++revision.value;
  known.value = false;
  let updateError = null;
  try {
    await PUT(`/shop/premium/autopay`, body);
  } catch (error: any) {
    updateError = error;
  }
  // Even a failed response can follow a committed write (e.g. a lost connection).
  const [status, statusError] = await getPremiumStatus();
  return [status, updateError ?? statusError];
}
