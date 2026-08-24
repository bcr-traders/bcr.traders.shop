import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

// Consolidated review prompt: after a Skip it waits this long before showing
// again, and stops entirely after this many dismissals (initial ask + 2 reminders).
const REMIND_AFTER_MS = 7 * 86_400_000 // 7 days
const MAX_DISMISSALS = 3

export interface PendingReviewProduct {
  id: string
  name: string
  image: string | null
}

/**
 * GET /api/reviews/pending
 *
 * Products the signed-in customer has RECEIVED (a delivered order) but not yet
 * reviewed. Drives the review gate that appears when they open the site.
 *
 * Mirrors the rule the review POST enforces — delivered orders only — so the
 * gate can never ask for a review the API would then reject, which would trap
 * the customer behind a popup they cannot satisfy.
 *
 * Always resolves to a list (never an error) — a failure here must not break
 * the storefront for everyone; it just means no gate this time.
 */
export async function GET() {
  const empty = NextResponse.json({ products: [] as PendingReviewProduct[] })

  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return empty

    const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
    const profileId = meta?.supabase_profile_id
    if (!profileId) return empty

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // select('*') on purpose — the live schema has drifted, and naming a column
    // that doesn't exist fails the WHOLE PostgREST query.
    const { data: orders } = await db
      .from('orders')
      .select('*')
      .eq('user_id', profileId)
      .eq('status', 'delivered')

    const delivered = (orders ?? []) as Array<{ items: OrderItem[] | null }>
    if (!delivered.length) return empty

    const purchased = new Set<string>()
    for (const o of delivered) {
      for (const i of o.items ?? []) {
        if (i?.product_id) purchased.add(i.product_id)
      }
    }
    if (!purchased.size) return empty

    // Anything they've already reviewed drops out — including reviews still
    // awaiting approval, or they'd be asked to review the same product twice.
    const { data: reviews, error: reviewsErr } = await db
      .from('reviews')
      .select('*')
      .eq('user_id', profileId)

    // 42P01 = reviews table missing. Treat as "nothing reviewed yet".
    if (reviewsErr && reviewsErr.code !== '42P01') return empty
    for (const r of (reviews ?? []) as Array<{ product_id: string }>) {
      purchased.delete(r.product_id)
    }
    if (!purchased.size) return empty

    const { data: products } = await db
      .from('products')
      .select('*')
      .in('id', [...purchased])
      .eq('is_active', true)

    const list: PendingReviewProduct[] = ((products ?? []) as Array<{
      id: string; name: string; images: string[] | null
    }>).map((p) => ({ id: p.id, name: p.name, image: p.images?.[0] ?? null }))

    if (!list.length) return empty

    // Controlled reminder: honour the consolidated prompt's dismiss/cooldown
    // state so it isn't shown on every visit. Best-effort — if the table is
    // missing (migration not yet run) or the read fails, we simply show it.
    try {
      const { data: state, error: stateErr } = await db
        .from('review_prompt_state')
        .select('remind_after, dismiss_count')
        .eq('user_id', profileId)
        .maybeSingle()
      if (!stateErr && state) {
        const s = state as { remind_after: string | null; dismiss_count: number }
        const dismissed = Number(s.dismiss_count ?? 0) >= MAX_DISMISSALS
        const cooling = !!s.remind_after && new Date(s.remind_after) > new Date()
        if (dismissed || cooling) return empty
      }
    } catch { /* show on any failure */ }

    return NextResponse.json({ products: list })
  } catch (e) {
    console.error('[reviews/pending] failed:', e)
    return empty
  }
}

/**
 * POST /api/reviews/pending — record the customer's interaction with the
 * consolidated review prompt so it follows the reminder rule instead of
 * re-appearing every visit.
 *
 *   { action: 'skip' }     → dismiss_count += 1, cool down 7 days
 *   { action: 'complete' } → cool down 7 days only (they engaged; no count bump)
 *
 * Best-effort: never breaks the storefront. If the table is missing (migration
 * not yet run) the dismissal just doesn't persist this time.
 */
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

    const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
    const profileId = meta?.supabase_profile_id
    if (!profileId) return NextResponse.json({ ok: false }, { status: 400 })

    let action: unknown
    try { action = (await req.json())?.action } catch { /* no body */ }
    if (action !== 'skip' && action !== 'complete') {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: existing } = await db
      .from('review_prompt_state')
      .select('dismiss_count')
      .eq('user_id', profileId)
      .maybeSingle()
    const currentCount = Number((existing as { dismiss_count?: number } | null)?.dismiss_count ?? 0)

    await db.from('review_prompt_state').upsert(
      {
        user_id: profileId,
        remind_after: new Date(Date.now() + REMIND_AFTER_MS).toISOString(),
        dismiss_count: action === 'skip' ? currentCount + 1 : currentCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reviews/pending POST] failed:', e)
    // Storefront must keep working even if persistence fails.
    return NextResponse.json({ ok: true })
  }
}
