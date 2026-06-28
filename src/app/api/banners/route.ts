import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ClerkPublicMetadata } from '@/types'

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get('admin') === 'true'
  if (admin) {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('banners').select('*').order('display_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banners').select('*').eq('is_active', true).order('display_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('banners').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
