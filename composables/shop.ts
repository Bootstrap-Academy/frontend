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

/**
 * What the note about a heart refill without enough Morphcoins names: the
 * price of the refill, and the smallest purchase the coin shop takes with its
 * price in Euro.
 */
export function heartRefillNotice(hearts: HeartConfig, coins: CoinConfig, locale: string) {
  return {
    coins: hearts.hearts_refill_price,
    min: COIN_PURCHASE_MIN,
    price: formatEuros(coinsToEuros(COIN_PURCHASE_MIN, coins), locale),
  };
}

type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string;

/**
 * A coin price as `Price` writes it: the coin figure and its Euro total including VAT,
 * e.g. "1.000 Morphcoins" and "10,00 € inkl. 19 % MwSt.".
 */
export function coinPriceParts(coins: number, config: CoinConfig, locale: string, t: Translate) {
  const number = (value: number, options: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", options).format(value);
  return {
    coins: t("Headings.Morphcoins", { n: number(coins) }, coins),
    euros: t("Body.PriceInclVat", {
      amount: formatEuros(coinsToEuros(coins, config), locale),
      vat: number(config.vat_percent, { maximumFractionDigits: 2 }),
    }),
  };
}

/** A coin price in running text, e.g. "500 Morphcoins (5,00 € inkl. 19 % MwSt.)". */
export function coinPriceText(coins: number, config: CoinConfig, locale: string, t: Translate) {
  const { coins: figure, euros } = coinPriceParts(coins, config, locale, t);
  return `${figure} (${euros})`;
}

/** Format an amount of Euro for the given interface language. */
export function formatEuros(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Hearts are counted in half hearts by the API (`hearts_max` is 6), while the
 * terms and conditions and the whole interface use whole hearts drawn in
 * halves (three hearts, one heart per incorrect solution). Every heart figure shown to a user goes through this
 * conversion so that the interface never states the raw API number.
 */
export function displayHearts(hearts: number): number {
  return (Number(hearts) || 0) / 2;
}

/** Number of whole hearts drawn for `hearts_max`, e.g. 3 for the API's 6. */
export function heartSlots(config: HeartConfig): number {
  return Math.ceil(displayHearts(config.hearts_max));
}

/** Format a heart figure in the displayed unit, e.g. `0,5` or `3`. */
export function formatHearts(hearts: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 1,
  }).format(displayHearts(hearts));
}

/**
 * The hearts a refill quote adds, for "Body.OrderHeartsQuantity": the figure in the
 * displayed unit and the plural choice (one whole heart or more). The quote fixes the
 * quantity in `facts.refill_units` (half hearts); without it the line is left out.
 */
export function refillQuantity(
  offer: { product?: { facts?: Record<string, unknown> } } | null | undefined,
  locale: string
): { n: string; plural: number } | null {
  const units = Number(offer?.product?.facts?.refill_units);
  if (!Number.isFinite(units) || units <= 0) return null;
  return { n: formatHearts(units, locale), plural: units === 2 ? 1 : 2 };
}

/**
 * Timestamp of the next automatic refill. The backend refills lazily whenever
 * the last refill is older than the most recent `auto_refill_time`, which is
 * 00:00 **UTC** — not the local midnight of the visitor.
 */
export function nextHeartRefill(now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
}

/** The next automatic refill as the visitor's own time of day, e.g. `02:00` in Berlin in summer. */
export function heartRefillTime(locale: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat(locale.startsWith("de") ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(nextHeartRefill(now));
}
