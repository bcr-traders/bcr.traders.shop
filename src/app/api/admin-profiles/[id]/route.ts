import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { AdminPermissions } from '@/types/admin.types'

// §1.3 / Rule #9: managing admin accounts requires super_admin, or an admin who
// actually holds the `manage_admin_profiles` permission. A plain `admin` role is
// NOT enough — otherwise any admin could edit/deactivate other admins or grant
// themselves permissions by PATCHing their own row (privilege escalation).
async function requireAdminAccess(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role === 'super_admin') return null
  if (meta?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle()
  const perms = (profile as unknown as { permissions: AdminPermissions } | null)?.permissions
  if (!perms?.manage_admin_profiles) return Response.json({ error: 'Forbidden' }, { status: 403 })
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
