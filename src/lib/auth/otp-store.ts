import { createAdminClient } from '@/lib/supabase/server'

export async function recordOtpSend(verificationId: string, phoneDigits: string) {
  const admin = createAdminClient()
  await admin.from('otp_verifications').insert({
    verification_id: verificationId,
    phone_digits: phoneDigits,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
}

/**
 * Consumes a one-shot verificationId->phone binding. Returns the phone it
 * was issued for, or null if missing, expired, or already consumed.
 */
export async function consumeOtpBinding(verificationId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('otp_verifications')
    .select('phone_digits, expires_at, consumed_at')
    .eq('verification_id', verificationId)
    .maybeSingle()

  if (!data) return null
  if (data.consumed_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null

  await admin
    .from('otp_verifications')
    .update({ consumed_at: new Date().toISOString() })
    .eq('verification_id', verificationId)

  return data.phone_digits as string
}
