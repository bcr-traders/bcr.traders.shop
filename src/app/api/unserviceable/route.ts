import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

/**
 * Re-alerting admins about the same person + pincode inside this window adds
 * nothing — they already have the lead in their inbox and on the panel.
 */
const DEDUPE_WINDOW_HOURS = 24

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('unserviceable_attempts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  // Registration gate: the whole point of this endpoint is capturing a lead we
  // can act on, and an anonymous row has no name or phone to follow up with.
  // The UI blocks the check before it gets here; this is the authoritative
  // check, since a client-side gate is only a suggestion.
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return Response.json(
      { error: 'Please log in to check delivery availability.', error_code: 'auth_required' },
      { status: 401 },
    )
  }

  // A signed-in visitor retyping their pincode shouldn't be able to spam the
  // table or the admins' inboxes.
  const limit = await rateLimit({ key: `unserviceable:${userId}:${getClientIp(request)}`, limit: 20, windowSec: 600 })
  if (!limit.ok) return rateLimitResponse(limit)

  const body = await request.json().catch(() => ({}))
  const { name, phone, city, state, cart_items, cart_value } = body ?? {}

  const pincode = String(body?.pincode ?? '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(pincode)) {
    return Response.json({ error: 'A valid 6-digit pincode is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Trust the session over the request body for identity — the client may send
  // nothing at all (the header check posts only a pincode).
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  let resolvedName: string | null = typeof name === 'string' && name.trim() ? name.trim() : null
  let resolvedPhone = typeof phone === 'string' ? phone : ''
  let resolvedCart: unknown = cart_items ?? null
  let resolvedCartValue: number | null = typeof cart_value === 'number' ? cart_value : null

  const { data: profile } = await db.from('profiles').select('name, phone').eq('id', profileId).maybeSingle()
  if (profile) {
    if (!resolvedName) resolvedName = profile.name ?? null
    if (!resolvedPhone) resolvedPhone = profile.phone ?? ''
  }

  // Pull their current cart for context if the client didn't send one — it
  // tells the admin how much business is behind the lead.
  if (!resolvedCart) {
    const { data: cart } = await db
      .from('abandoned_carts')
      .select('cart_items, total_value')
      .eq('user_id', profileId)
      .order('last_activity', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cart) {
      resolvedCart = cart.cart_items ?? null
      resolvedCartValue = resolvedCartValue ?? cart.total_value ?? null
    }
  }

  // Dedupe: same person, same pincode, inside the window → refresh the existing
  // row instead of stacking duplicates, and don't re-email.
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: recent } = await db
    .from('unserviceable_attempts')
    .select('id')
    .eq('user_id', profileId)
    .eq('pincode', pincode)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recent?.id) {
    // Keep the newest context (cart may have grown since the first attempt).
    await db
      .from('unserviceable_attempts')
      .update({
        name: resolvedName,
        phone: resolvedPhone,
        city: city ?? null,
        state: state ?? null,
        cart_snapshot: resolvedCart,
      })
      .eq('id', recent.id)
    return Response.json({ id: recent.id, deduped: true }, { status: 200 })
  }

  const { data, error } = await db
    .from('unserviceable_attempts')
    .insert({
      user_id: profileId,
      name: resolvedName,
      phone: resolvedPhone,
      pincode,
      city: city ?? null,
      state: state ?? null,
      cart_snapshot: resolvedCart,
      admin_notified: false,
      admin_contacted: false,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const insertedId = (data as { id: string }).id

  // Notify admins after the response — `after()` keeps the function alive so the
  // alert reliably sends instead of being dropped when the response returns.
  after(() => notifyAdmins(insertedId, resolvedName, resolvedPhone, pincode, city ?? null, resolvedCart as OrderItem[] | null, resolvedCartValue))

  return Response.json({ id: insertedId }, { status: 201 })
}

async function notifyAdmins(
  id: string,
  customerName: string | null,
  phone: string,
  pincode: string,
  city: string | null,
  cartItems: OrderItem[] | null,
  cartValue: number | null,
) {
  try {
    const resend = await import('@/lib/resend')
    const admins = await resend.getOrderEmailAdmins()

    await resend.sendUnserviceableAlert(
      { id, customerName, phone, pincode, city, cartItems, cartValue },
      admins,
    )

    // Mark admin_notified = true
    const { createAdminClient: getAdmin } = await import('@/lib/supabase/server')
    const supabase = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('unserviceable_attempts')
      .update({ admin_notified: true })
      .eq('id', id)
  } catch (e) {
    console.error('Unserviceable alert email error:', e)
  }
}
