import { decodeApiError } from "~/utils/apiError";

export const useHeartInfo = () => useState("heartInfo", () => null);

/**
 * Whether a learner who pays with hearts has none left for another attempt, so
 * a submit form shows `UserHeartsEmpty` in place of its button.
 *
 * An attempt needs one whole heart. The balance only counts while the account
 * is known to learn with hearts and without Premium. A refusal by the server
 * always counts and holds until a later balance shows a heart again.
 */
export function useHeartsEmpty() {
  const heartInfo: any = useHeartInfo();
  const premiumInfo: any = usePremiumInfo();
  const premiumKnown = usePremiumStatusKnown();
  const { isDaily, showHearts } = useDailyLearning();
  const refused = ref(false);
  const enough = computed(() => displayHearts(heartInfo.value?.hearts ?? 0) >= 1);

  watch(heartInfo, () => {
    if (enough.value) refused.value = false;
  });

  const heartsEmpty = computed(() => {
    if (premiumInfo.value?.premium || isDaily.value) return false;
    if (refused.value) return true;
    return showHearts.value && premiumKnown.value && !!heartInfo.value && !enough.value;
  });

  /** An attempt was refused for lack of hearts; the balance is read again to confirm or clear it. */
  function reportNoHearts() {
    refused.value = true;
    void getHearts();
  }

  /** Takes over the "not enough hearts" refusal of a submission; any other error stays with the caller. */
  function handleNoHearts(error: unknown) {
    if (decodeApiError(error).kind !== "hearts") return false;
    reportNoHearts();
    return true;
  }

  return { heartsEmpty, handleNoHearts, reportNoHearts };
}

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
