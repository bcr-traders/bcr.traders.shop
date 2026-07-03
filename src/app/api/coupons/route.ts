import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get('admin') === 'true'
  if (admin) {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code, description, discount_type, discount_value, min_order_amount')
    .eq('is_active', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  // Ensure code is uppercase
  if (body.code) body.code = String(body.code).toUpperCase().trim()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('coupons').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
