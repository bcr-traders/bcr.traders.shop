import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ClerkPublicMetadata } from '@/types'

export async function getAuthRole(): Promise<ClerkPublicMetadata['role'] | null> {
  const { sessionClaims } = await auth()
  return (sessionClaims?.publicMetadata as ClerkPublicMetadata)?.role ?? null
}

export async function requireRole(...roles: ClerkPublicMetadata['role'][]) {
  const role = await getAuthRole()
  if (!role || !roles.includes(role)) redirect('/login')
  return role
}

export async function requireAdminRole() {
  return requireRole('super_admin', 'admin')
}

export async function requireSuperAdmin() {
  return requireRole('super_admin')
}