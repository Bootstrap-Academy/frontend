export const useHeartInfo = () => useState("heartInfo", () => null);

/** Refill the hearts to the maximum for `hearts_refill_price` Morphcoins. */
export async function refillHearts() {
  try {
    const res = await PUT(`/shop/hearts`);
    await getHearts();
    await getBalance();
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}
export async function getHearts() {
  try {
    const user: any = useUser();
    const res = await GET(`/shop/hearts/${user.value.id}`);
    const heartInfo = useHeartInfo();
    heartInfo.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}
