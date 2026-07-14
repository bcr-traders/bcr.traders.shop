import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { OrderStatus } from '@/types/database.types'
import { notifyOrderEvent } from '@/lib/resend/notify'
import { restoreStockForOrder } from '@/lib/orders/stock'

const VALID_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: OrderStatus; notes?: string; estimated_delivery?: string; custom_message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.estimated_delivery !== undefined) updateData.estimated_delivery = body.estimated_delivery
  if (body.custom_message !== undefined) updateData.custom_message = body.custom_message

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Restore stock when an order is cancelled
  if (body.status === 'cancelled') {
    void restoreStockForOrder(id)
  }

  // Notify the customer AND every eligible admin/super-admin on each status
  // change (PRD #4). Best-effort — never blocks the status update.
  if (body.status && ['confirmed', 'packed', 'shipping', 'delivered', 'cancelled'].includes(body.status)) {
    const status = body.status
    after(() => notifyOrderEvent(id, status, { adminProfileId: meta?.admin_profile_id ?? null }))
  }

  return NextResponse.json({ ok: true })
}

