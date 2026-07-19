// Delivery-fee rule, shared by the cart, checkout and the order route so all
// three agree on what the customer sees and is charged.
//
// If any item in the cart carries a per-product delivery charge (set by the
// admin), the fee is the SUM of those charges — each product counted once,
// regardless of quantity. This lets the admin put a specific charge (e.g. ₹100
// for a heavy item) that overrides the flat fee. When no item has a charge, the
// flat fee applies: free at/above FREE_DELIVERY_MIN, otherwise FLAT_DELIVERY_FEE.

export const FREE_DELIVERY_MIN = 1000
export const FLAT_DELIVERY_FEE = 50

/** Sum of enabled per-product delivery charges (each product once). */
export function perProductDelivery(items: Array<{ delivery_charge?: number | null }>): number {
  return items.reduce((sum, i) => sum + (Number(i.delivery_charge) || 0), 0)
}

/** The delivery fee to display AND charge for a cart/order. */
export function computeDeliveryFee(
  items: Array<{ delivery_charge?: number | null }>,
  subtotal: number,
): number {
  const perProduct = perProductDelivery(items)
  if (perProduct > 0) return perProduct
  return subtotal >= FREE_DELIVERY_MIN ? 0 : FLAT_DELIVERY_FEE
}
