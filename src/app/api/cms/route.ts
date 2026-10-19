import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AuthMetadata } from '@/types'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const supabase = await createClient()

  let query = supabase.from('cms_content').select('*')
  if (key) query = query.eq('key', key)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(key ? (data?.[0] ?? null) : data)
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { key, value } = await req.json() as { key: string; value: unknown }
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  // Cash-on-Delivery availability is super-admin only: turning COD off changes
  // how every customer pays, so a regular admin must not be able to flip it,
  // nor change the advance percentage. A client-side lock is only UX — this is
  // the authoritative check.
  const supabaseRead = createAdminClient()
  if (key === 'settings' && meta.role !== 'super_admin') {
    const incoming = (value ?? {}) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRow } = await (supabaseRead as any)
      .from('cms_content').select('value').eq('key', 'settings').maybeSingle()
    const current = (existingRow?.value ?? {}) as Record<string, unknown>

    const changed = (k: string) =>
      Object.prototype.hasOwnProperty.call(incoming, k) && incoming[k] !== current[k]

    if (changed('cod_enabled') || changed('cod_online_percent')) {
      return NextResponse.json(
        { error: 'Only a super admin can change Cash on Delivery settings.' },
        { status: 403 },
      )
    }
  }

  // Only write the columns the CMS actually needs. The LIVE cms_content table has
  // drifted from the migrations and is missing `is_active` (and possibly other
  // optional columns) — writing one that doesn't exist fails the whole upsert
  // ("Could not find the 'is_active' column ... in the schema cache"). key + value
  // are all that's required; any updated_at column with a default fills itself.
  const { error } = await supabaseRead
    .from('cms_content')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
