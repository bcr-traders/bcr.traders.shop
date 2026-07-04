import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { AuthMetadata } from '@/types'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout — BCR Traders',
  description: 'Securely complete your BCR Traders wholesale order with Cash on Delivery and fast delivery across Odisha.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login?next=/checkout')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? ''

  if (!profileId) redirect('/')

  return <CheckoutClient profileId={profileId} />
}
