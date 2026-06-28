import { SignIn } from '@clerk/nextjs'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <SignIn fallbackRedirectUrl="/admin/dashboard" signUpUrl={false as never} />
    </main>
  )
}