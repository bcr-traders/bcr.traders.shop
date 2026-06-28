import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ClerkPublicMetadata } from '@/types'

type Params = { params: Promise<{ id: string }> }

function adminOnly(role?: string) {
  return role !== 'super_admin' && role !== 'admin'
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['is_active', 'display_order']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
