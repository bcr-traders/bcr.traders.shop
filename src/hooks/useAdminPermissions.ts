'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import type { AdminPermissions } from '@/types/admin.types'

export function useAdminPermissions() {
  const { user, isLoaded } = useUser()
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null)
  const [loading, setLoading] = useState(true)

  const meta = user?.publicMetadata as { role?: string; admin_profile_id?: string } | undefined
  const role = meta?.role
  const adminProfileId = meta?.admin_profile_id

  useEffect(() => {
    if (!isLoaded) return
    if (!adminProfileId) { setLoading(false); return }

    fetch(`/api/admin-profiles/${adminProfileId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.permissions) setPermissions(data.permissions) })
      .finally(() => setLoading(false))
  }, [isLoaded, adminProfileId])

  return {
    permissions,
    loading: !isLoaded || loading,
    role,
    isSuperAdmin: role === 'super_admin',
    can: (key: keyof AdminPermissions) => role === 'super_admin' || !!permissions?.[key],
  }
}
