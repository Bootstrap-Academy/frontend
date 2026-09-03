export const useHeartInfo = () => useState("heartInfo", () => null);

/**
 * Refill the hearts to the maximum for `hearts_refill_price` Morphcoins.
 *
 * The body carries the declarations of § 356 Abs. 6 Nr. 2 BGB; without them
 * the refill is refused.
 */
export async function refillHearts(body: any) {
  try {
    const res = await PUT(`/shop/hearts`, body);
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
