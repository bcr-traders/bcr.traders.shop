import { Suspense } from 'react'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E5E5E5] p-4 font-sans">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="mb-8 text-center border-b-4 border-black pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tight text-black">
            Admin Portal.
          </h1>
          <p className="font-bold text-xs uppercase tracking-widest mt-2 text-black/60">
            BCR Traders Management
          </p>
        </div>
        <div className="flex justify-center">
          <Suspense fallback={null}>
            <PhoneAuthForm
              portal="admin"
              allowSignup={false}
              title="Staff Sign In"
              subtitle="Enter your registered mobile number"
            />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
