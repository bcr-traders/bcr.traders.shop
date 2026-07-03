import { Suspense } from 'react'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'
import Logo from '@/components/layout/Logo'

export default async function DeliveryLoginPage() {
  const { userId, sessionClaims } = await auth()
  if (userId && sessionClaims?.publicMetadata.role === 'delivery') {
    redirect('/delivery/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 gap-6">
      <div className="text-center flex flex-col items-center">
        <Logo className="h-16 w-auto mb-3" />
        <h1 className="font-headline-md text-headline-md text-primary">Delivery Login</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">BCR Traders · Delivery Portal</p>
      </div>
      <Suspense fallback={null}>
        <PhoneAuthForm
          portal="delivery"
          allowSignup={false}
          title="Delivery Sign In"
          subtitle="Enter your registered mobile number"
        />
      </Suspense>
    </main>
  )
}
