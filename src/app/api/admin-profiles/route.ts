import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_PERMISSIONS } from '@/types/admin.types'
import type { ClerkPublicMetadata } from '@/types'
import type { AdminPermissions } from '@/types/admin.types'

async function requireManageAdminProfiles(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (meta?.role === 'super_admin') return null

  if (meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Regular admin: must have manage_admin_profiles permission
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('permissions')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  const perms = (profile as unknown as { permissions: AdminPermissions } | null)?.permissions
  if (!perms?.manage_admin_profiles) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const authError = await requireManageAdminProfiles()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const authError = await requireManageAdminProfiles()
  if (authError) return authError

  const body = await request.json()
  const { name, phone, email, role, permissions } = body

  if (!name || !phone || !role) {
    return Response.json({ error: 'name, phone, and role are required' }, { status: 400 })
  }

  if (!['admin', 'delivery'].includes(role)) {
    return Response.json({ error: 'Role must be admin or delivery' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_profiles')
    .insert({
      name,
      phone,
      email: email || null,
      role,
      permissions: role === 'delivery' ? {} : (permissions ?? DEFAULT_PERMISSIONS),
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data, { status: 201 })
}
