// Delivery-fee rule, shared by the cart, checkout and the order route so all
// three agree on what the customer sees and is charged.
//
// If any item in the cart carries a per-product delivery charge (set by the
// admin), the fee is the SUM of those charges — each product counted once,
// regardless of quantity. This lets the admin put a specific charge (e.g. ₹100
// for a heavy item) that overrides the flat fee. When no item has a charge, the
// flat fee applies: free at/above FREE_DELIVERY_MIN, otherwise FLAT_DELIVERY_FEE.

// Defaults, used until an admin overrides them in Settings.
export const FREE_DELIVERY_MIN = 1000
export const FLAT_DELIVERY_FEE = 50

export interface DeliveryConfig {
  /** Order subtotal at/above which delivery is free. */
  freeDeliveryMin: number
  /** Flat fee charged when the subtotal is below the free-delivery threshold. */
  flatDeliveryFee: number
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  freeDeliveryMin: FREE_DELIVERY_MIN,
  flatDeliveryFee: FLAT_DELIVERY_FEE,
}

/**
 * Read the admin's delivery thresholds off the `settings` CMS value. Any missing
 * or invalid field falls back to the default, so a partial/absent config can
 * never make delivery free (or break) by accident.
 */
export function parseDeliveryConfig(settingsValue: unknown): DeliveryConfig {
  if (!settingsValue || typeof settingsValue !== 'object') return DEFAULT_DELIVERY_CONFIG
  const v = settingsValue as Record<string, unknown>
  const min = Number(v.free_delivery_min)
  const fee = Number(v.flat_delivery_fee)
  return {
    freeDeliveryMin: Number.isFinite(min) && min >= 0 ? min : FREE_DELIVERY_MIN,
    flatDeliveryFee: Number.isFinite(fee) && fee >= 0 ? fee : FLAT_DELIVERY_FEE,
  }
}

/** Sum of enabled per-product delivery charges (each product once). */
export function perProductDelivery(items: Array<{ delivery_charge?: number | null }>): number {
  return items.reduce((sum, i) => sum + (Number(i.delivery_charge) || 0), 0)
}

/**
 * The delivery fee to display AND charge for a cart/order — the single rule the
 * cart, checkout and order route all share. Per-product charges (if any) win;
 * otherwise it's free at/above the admin threshold, else the flat fee.
 */
export function computeDeliveryFee(
  items: Array<{ delivery_charge?: number | null }>,
  subtotal: number,
  config: DeliveryConfig = DEFAULT_DELIVERY_CONFIG,
): number {
  const perProduct = perProductDelivery(items)
  if (perProduct > 0) return perProduct
  return subtotal >= config.freeDeliveryMin ? 0 : config.flatDeliveryFee
}
