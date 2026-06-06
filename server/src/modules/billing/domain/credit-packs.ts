/**
 * Purchasable credit packs and their price in the smallest currency unit
 * (USD cents). Single source of truth shared by the top-up validator and the
 * payment provider, so an unpriced pack can never reach checkout.
 */
export const CREDIT_PACK_PRICE_CENTS: Readonly<Record<number, number>> = {
  50: 500, // $5.00
  100: 900, // $9.00
  250: 2000, // $20.00
};

export const CREDIT_PACK_CURRENCY = 'usd';

/** The credit amounts that can be purchased. */
export const CREDIT_PACKS: readonly number[] = Object.keys(CREDIT_PACK_PRICE_CENTS).map(Number);

/** True when `credits` is a known, priced pack. */
export function isCreditPack(credits: number): boolean {
  return Object.prototype.hasOwnProperty.call(CREDIT_PACK_PRICE_CENTS, credits);
}
