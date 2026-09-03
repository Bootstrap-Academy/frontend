export const usePremiumInfo = () => useState("premiumInfo", () => null);

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
  try {
    const user: any = useUser();
    const res = await GET(`/shop/premium/${user.value.id}`);
    const premiumInfo = usePremiumInfo();
    premiumInfo.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function buyPremium(body: any) {
  try {
    console.log("body", body);
    const res = await POST(`/shop/premium`, body);
    await getPremiumStatus();
    await getBalance();
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function updatePremiumAutoPay(body: any) {
  try {
    const res = await PUT(`/shop/premium/autopay`, body);
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}
