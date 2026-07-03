import { Suspense } from 'react'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'

export default async function DeliveryLoginPage() {
  const { userId, sessionClaims } = await auth()
  if (userId && sessionClaims?.publicMetadata.role === 'delivery') {
    redirect('/delivery/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f5f0e8] p-4 gap-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-on-primary text-[28px]">local_shipping</span>
        </div>
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
