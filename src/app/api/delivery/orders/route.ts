import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import { isDeliveryEnabled } from '@/lib/settings/delivery'

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'delivery' || !meta.admin_profile_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await isDeliveryEnabled())) {
    return NextResponse.json({ error: 'The delivery panel is currently disabled.' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, error } = await (supabase as any)
    .from('orders')
    // amount_due_cod arrives with migration 036 and is NULL except on 'partial'
    // orders. Selected via '*' rather than named, because naming a column the
    // live table lacks fails the WHOLE query (see the schema-drift notes).
    .select('*')
    .eq('assigned_to', meta.admin_profile_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!orders || orders.length === 0) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch OTP status for all these orders
  const orderIds = orders.map((o: { id: string }) => o.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otps } = await (supabase as any)
    .from('delivery_otps')
    .select('order_id, is_used')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false })

  // Build a map: order_id → { sent: true, verified: bool }
  const otpMap: Record<string, { sent: boolean; verified: boolean }> = {}
  for (const o of (otps ?? [])) {
    if (!otpMap[o.order_id]) {
      otpMap[o.order_id] = { sent: true, verified: o.is_used }
    }
  }

  // Project explicitly rather than spreading the row: the query selects '*'
  // (naming a drifted column would fail it outright), but delivery staff have
  // no business seeing every order column.
  //
  // amount_to_collect is the single number the delivery person acts on:
  //   cod      → the whole total
  //   partial  → only the balance, the advance is already paid
  //   online   → nothing, it's prepaid
  const enriched = orders.map((o: Record<string, unknown>) => {
    const method = String(o.payment_method ?? 'cod')
    const total = Number(o.total) || 0
    const dueCod = o.amount_due_cod == null ? null : Number(o.amount_due_cod)
    const amountToCollect =
      method === 'online' ? 0
      : method === 'partial' ? Math.max(0, dueCod ?? 0)
      : total
    return {
      id: o.id,
      status: o.status,
      total,
      subtotal: o.subtotal ?? null,
      delivery_fee: o.delivery_fee ?? null,
      created_at: o.created_at,
      address: o.address ?? null,
      items: o.items ?? [],
      payment_method: method,
      amount_paid_online: o.amount_paid_online == null ? null : Number(o.amount_paid_online),
      amount_due_cod: dueCod,
      amount_to_collect: amountToCollect,
      assigned_to: o.assigned_to ?? null,
      delivered_at: o.delivered_at ?? null,
      otp_sent: otpMap[o.id as string]?.sent ?? false,
      otp_verified: otpMap[o.id as string]?.verified ?? false,
    }
  })

  return NextResponse.json({ orders: enriched })
}
