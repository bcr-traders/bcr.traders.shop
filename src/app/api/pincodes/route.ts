import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('pincodes').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { pincode, area_name, city, state, delivery_days } = body

  if (!pincode || !/^\d{6}$/.test(pincode) || !city) {
    return Response.json({ error: 'pincode (6 digits) and city are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pincodes')
    .insert({ pincode, area_name: area_name || null, city, state: state || 'Odisha', delivery_days: delivery_days || 2, is_active: true })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
