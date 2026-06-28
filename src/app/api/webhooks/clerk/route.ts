import { headers } from 'next/headers'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { updateClerkPublicMetadata } from '@/lib/clerk/sync'

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return new Response('Webhook secret not set', { status: 500 })

  const h = await headers()
  const svixId = h.get('svix-id')
  const svixTs = h.get('svix-timestamp')
  const svixSig = h.get('svix-signature')

  if (!svixId || !svixTs || !svixSig) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const body = await request.text()

  let event: WebhookEvent
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTs,
      'svix-signature': svixSig,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, phone_numbers, email_addresses, first_name, last_name, public_metadata } = event.data
    const phone = phone_numbers?.[0]?.phone_number ?? null
    const email = email_addresses?.[0]?.email_address ?? null
    const name = [first_name, last_name].filter(Boolean).join(' ') || null
    const role = (public_metadata as { role?: string })?.role ?? 'customer'

    if (role === 'admin' || role === 'super_admin' || role === 'delivery') {
      // Link Clerk account to the existing admin_profiles row (matched by phone)
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .update({ clerk_user_id: id, updated_at: new Date().toISOString() })
        .eq('phone', phone)
        .select('id, role')
        .single()

      if (adminProfile) {
        await updateClerkPublicMetadata(id, {
          role: adminProfile.role,
          admin_profile_id: adminProfile.id,
        })
      }
    } else {
      // Customer — upsert into profiles table
      await supabase.from('profiles').upsert(
        { clerk_user_id: id, phone, email, name, updated_at: new Date().toISOString() },
        { onConflict: 'clerk_user_id' }
      )
    }
  }

  return new Response(null, { status: 200 })
}
