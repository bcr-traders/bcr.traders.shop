import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ClerkPublicMetadata } from '@/types'

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()

  if (!userId) redirect('/delivery/login')

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  if (meta?.role !== 'delivery') redirect('/delivery/login')

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {children}
    </div>
  )
}
