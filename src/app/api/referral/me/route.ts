import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { getReferralConfig, referralBenefitText } from '@/lib/referral/config'

/**
 * GET /api/referral/me — the signed-in customer's referral status: their code
 * (if they have one yet), accrued reward credit, the program benefit blurb, and
 * whether they're still eligible to redeem someone else's code (new customers,
 * first order only).
 */
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const db = createAdminClient()
  const cfg = await getReferralConfig()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (db as any)
    .from('profiles')
    .select('referral_code, referral_credit')
    .eq('id', profileId)
    .maybeSingle()

  // Eligible to be a referee only with zero prior orders and no existing referral.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: priorOrders } = await (db as any)
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingReferral } = await (db as any)
    .from('referrals')
    .select('id')
    .eq('referee_id', profileId)
    .maybeSingle()

  return NextResponse.json({
    enabled: cfg.enabled,
    code: (profile?.referral_code as string | null) ?? null,
    credit: Number(profile?.referral_credit ?? 0),
    benefit: referralBenefitText(cfg),
    eligibleForReferee: cfg.enabled && (priorOrders ?? 0) === 0 && !existingReferral,
  })
}
