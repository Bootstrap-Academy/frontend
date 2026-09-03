/**
 * Pricing information for everything that is paid for with Morphcoins.
 *
 * Morphcoins are a means of payment, so every coin price is also a price in
 * Euro. `GET /shop/coins/config` publishes the rate and the VAT percentage;
 * the fallback below matches the terms and conditions (100 coins = 1 €,
 * 19 % VAT) so prices stay correct if the endpoint is unavailable.
 */

export interface CoinConfig {
  coins_per_euro: number;
  vat_percent: number;
}

export interface HeartConfig {
  hearts_max: number;
  hearts_refill_price: number;
}

const COIN_CONFIG_FALLBACK: CoinConfig = { coins_per_euro: 100, vat_percent: 19 };

/** Premium plan prices in Morphcoins (`premium.monthly_price` / `premium.yearly_price`). */
export const PREMIUM_PRICE_FALLBACK = { MONTHLY: 1_000, YEARLY: 10_000 };

/** Purchase limits of the coin shop (`coin.purchase_min` / `coin.purchase_max`). */
export const COIN_PURCHASE_MIN = 500;
export const COIN_PURCHASE_MAX = 1_000_000;
const HEART_CONFIG_FALLBACK: HeartConfig = { hearts_max: 6, hearts_refill_price: 50 };

export const useCoinConfig = () => useState<CoinConfig>("coinConfig", () => COIN_CONFIG_FALLBACK);
export const useHeartConfig = () =>
  useState<HeartConfig>("heartConfig", () => HEART_CONFIG_FALLBACK);

const useCoinConfigLoaded = () => useState("coinConfigLoaded", () => false);
const useHeartConfigLoaded = () => useState("heartConfigLoaded", () => false);

/** Load the coin pricing configuration once per application start. */
export async function loadCoinConfig() {
  const loaded = useCoinConfigLoaded();
  if (loaded.value) return;
  loaded.value = true;

  try {
    const response: any = await GET(`/shop/coins/config`);
    const rate = Number(response?.coins_per_euro);
    const vat = Number(response?.vat_percent);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(vat) || vat < 0) return;

    useCoinConfig().value = { coins_per_euro: rate, vat_percent: vat };
  } catch (error) {
    // Keep the fallback rate; a purchase must never show an empty price.
  }
}

/** Load the heart configuration (maximum and refill price) once. */
export async function loadHeartConfig() {
  const loaded = useHeartConfigLoaded();
  if (loaded.value) return;
  loaded.value = true;

  try {
    const response: any = await GET(`/shop/hearts/config`);
    const max = Number(response?.hearts_max);
    const price = Number(response?.hearts_refill_price);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(price) || price < 0) return;

    useHeartConfig().value = { hearts_max: max, hearts_refill_price: price };
  } catch (error) {
    // Keep the fallback values.
  }
}

/** Gross price in Euro of the given number of Morphcoins. */
export function coinsToEuros(coins: number, config: CoinConfig): number {
  const rate =
    config.coins_per_euro > 0 ? config.coins_per_euro : COIN_CONFIG_FALLBACK.coins_per_euro;
  return (Number(coins) || 0) / rate;
}

/** Share of the gross price that is VAT. */
export function vatShare(gross: number, config: CoinConfig): number {
  const vat = config.vat_percent;
  return (gross * vat) / (100 + vat);
}

/** Format an amount of Euro for the given interface language. */
export function formatEuros(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(amount) ? amount : 0);
}
