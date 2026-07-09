import { createAdminClient } from '@/lib/supabase/server'
import type { Address, OrderItem } from '@/types/database.types'
import type { OrderEmailData } from './index'

/**
 * PRD item #4 — single reusable "notify on order event" entry point.
 *
 * Fires on EVERY order status transition and:
 *   • emails the customer a status-appropriate update, and
 *   • emails every eligible admin/super-admin (getOrderEmailAdmins already
 *     includes super_admin unconditionally and excludes delivery staff).
 *
 * All sends are best-effort (Promise.allSettled) and any failure is logged, never
 * thrown — an email problem must never block or roll back the status change that
 * the caller has already committed.
 */
export async function notifyOrderEvent(
  orderId: string,
  status: string,
  opts: { adminProfileId?: string | null; skipCustomer?: boolean } = {},
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase as any)
      .from('orders')
      .select('id, user_id, order_number, items, address, subtotal, delivery_fee, discount, coupon_code, total, created_at, estimated_delivery, custom_message, notes')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('id', order.user_id ?? '')
      .maybeSingle()

    let confirmedByName: string | null = null
    if (opts.adminProfileId && status === 'confirmed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: adminProfile } = await (supabase as any)
        .from('admin_profiles')
        .select('name')
        .eq('id', opts.adminProfileId)
        .maybeSingle()
      confirmedByName = (adminProfile as { name?: string } | null)?.name ?? null
    }

    const addr = order.address as Address
    const emailData: OrderEmailData = {
      orderId,
      orderNumber: order.order_number,
      items: order.items as OrderItem[],
      address: addr,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee ?? 0,
      discount: order.discount ?? 0,
      couponCode: order.coupon_code ?? null,
      total: order.total,
      createdAt: order.created_at,
      customerEmail: (profile as { email?: string | null } | null)?.email ?? null,
      customerName: addr?.name,
      estimatedDelivery: order.estimated_delivery ?? null,
      customMessage: order.custom_message ?? null,
      confirmedByName,
      status,
      notes: order.notes ?? null,
    }

    const resend = await import('./index')
    const admins = await resend.getOrderEmailAdmins()

    const customerSend = opts.skipCustomer
      ? Promise.resolve()
      : status === 'confirmed'
        ? resend.sendOrderConfirmedCustomer(emailData)
        : resend.sendOrderStatusUpdate(emailData)

    const results = await Promise.allSettled([
      customerSend,
      resend.sendOrderStatusAdmin(emailData, admins),
    ])

    results.forEach((r) => {
      if (r.status === 'rejected') console.error(`[notifyOrderEvent] send failed for #${order.order_number} (${status}):`, r.reason)
    })
  } catch (e) {
    console.error('[notifyOrderEvent] error:', e)
  }
}
