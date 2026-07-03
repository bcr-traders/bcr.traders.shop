import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

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
  const body = await request.json()
  const { name, phone, pincode, city, state, cart_items, cart_value, user_id } = body

  if (!pincode) return Response.json({ error: 'pincode is required' }, { status: 400 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('unserviceable_attempts')
    .insert({
      user_id: user_id ?? null,
      name: name ?? null,
      phone: phone ?? '',
      pincode,
      city: city ?? null,
      state: state ?? null,
      cart_snapshot: cart_items ?? null,
      admin_notified: false,
      admin_contacted: false,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const insertedId = (data as { id: string }).id

  // Fire-and-forget: notify admins
  void notifyAdmins(insertedId, name ?? null, phone ?? '', pincode, city ?? null, cart_items ?? null, cart_value ?? null)

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
