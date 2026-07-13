import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

async function getProfileId(): Promise<string | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  return meta?.supabase_profile_id ?? userId
}

// DELETE /api/addresses/[id] — remove one of the caller's own saved addresses.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profileId = await getProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('addresses').delete().eq('id', id).eq('user_id', profileId)
  if (error) return NextResponse.json({ error: 'Could not delete address' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/addresses/[id] — set this address as the caller's default.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profileId = await getProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const db = createAdminClient()

  if (body.is_default === true) {
    // Confirm the address belongs to the caller before touching anything.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: own } = await (db as any).from('addresses').select('id').eq('id', id).eq('user_id', profileId).maybeSingle()
    if (!own) return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    // Only one default per customer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('addresses').update({ is_default: false }).eq('user_id', profileId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', profileId)
    if (error) return NextResponse.json({ error: 'Could not update address' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
