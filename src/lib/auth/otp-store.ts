import { createAdminClient } from '@/lib/supabase/server'

/**
 * Bind a verificationId to a phone number.
 *
 * `expiryMinutes` must match what the gateway was told, otherwise this binding
 * becomes the real ceiling and the admin's setting still wouldn't apply.
 */
export async function recordOtpSend(
  verificationId: string,
  phoneDigits: string,
  expiryMinutes = 10,
  /**
   * The validity the SMS gateway ACTUALLY applied, in seconds (from its send
   * response). Message Central caps OTP validity below what we request (e.g.
   * 120s vs a 5–15 min setting), so when this is known we bind to it instead of
   * the requested minutes — otherwise our stored expiry drifts far longer than
   * the code really lives. A small grace buffer keeps the gateway (not us) as
   * the true ceiling, so we never reject a code the gateway would still accept.
   */
  effectiveSeconds?: number,
) {
  const admin = createAdminClient()
  const ttlMs =
    typeof effectiveSeconds === 'number' && Number.isFinite(effectiveSeconds) && effectiveSeconds > 0
      ? (effectiveSeconds + 30) * 1000
      : Math.min(60, Math.max(1, Math.round(expiryMinutes) || 10)) * 60 * 1000
  await admin.from('otp_verifications').insert({
    verification_id: verificationId,
    phone_digits: phoneDigits,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
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
