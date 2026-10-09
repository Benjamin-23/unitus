// Members pay PayPal's transaction fee on top of chama payments, so the pool
// receives exactly the amount the chama's rules say. Server-only (reads env).
//
// Default rate 3.9% + $0.30 is what this sandbox account actually charged
// ($4.20 on $100, $30.72 on $780). PayPal's rate depends on the account and
// country, so set PAYPAL_FEE_PERCENT / PAYPAL_FEE_FIXED to your live rate.

const PERCENT = Number(process.env.PAYPAL_FEE_PERCENT ?? 3.9);
const FIXED = Number(process.env.PAYPAL_FEE_FIXED ?? 0.3);

const cents = (n: number) => Math.round(n * 100) / 100;

export type Charge = { principal: number; fee: number; total: number };

/**
 * The amount to charge so that, after PayPal takes PERCENT% + FIXED, the pool
 * is left with `principal`. Rounded up to the cent so the pool never comes up short.
 */
export function withFee(principal: number): Charge {
  const total = Math.ceil(((principal + FIXED) / (1 - PERCENT / 100)) * 100) / 100;
  return { principal: cents(principal), fee: cents(total - principal), total };
}
