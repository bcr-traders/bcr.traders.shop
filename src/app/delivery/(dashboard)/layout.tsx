import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()

  if (!userId) redirect('/delivery/login')

  if (sessionClaims?.publicMetadata.role !== 'delivery') redirect('/delivery/login')

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
