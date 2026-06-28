import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ClerkPublicMetadata } from '@/types'

async function requireAdminAccess(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAccess()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAccess()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { name, email, permissions, is_active } = body

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) update.name = name
  if (email !== undefined) update.email = email || null

  // Protect super_admin from permission/status changes
  if (existing.role !== 'super_admin') {
    if (permissions !== undefined) update.permissions = permissions
    if (is_active !== undefined) update.is_active = is_active
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAccess()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (existing?.role === 'super_admin') {
    return Response.json({ error: 'Super Admin cannot be deactivated' }, { status: 403 })
  }

  const { error } = await supabase
    .from('admin_profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
