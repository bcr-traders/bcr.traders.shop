import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { ClerkPublicMetadata } from '@/types'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout | BCR Traders',
  robots: { index: false },
}

export default async function CheckoutPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in?redirect_url=/checkout')

  const meta = sessionClaims?.publicMetadata as ClerkPublicMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? ''

  if (!profileId) redirect('/')

  return <CheckoutClient profileId={profileId} />
}
