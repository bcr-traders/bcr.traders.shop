import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

const PIN_RE = /^\d{6}$/

/**
 * GET /api/pincodes/lookup?pincode=751001 → { found, area, city, state, areas[] }
 *
 * Looks a pincode up via India Post's free public API so the admin's Add-Pincode
 * form can auto-fill area/city/state instead of typing them. Runs server-side to
 * avoid CORS, and gated to admins (it's an admin-only convenience).
 */
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pincode = (req.nextUrl.searchParams.get('pincode') ?? '').trim()
  if (!PIN_RE.test(pincode)) return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 })

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(t)
    if (!res.ok) return NextResponse.json({ found: false }, { status: 200 })

    const data = (await res.json()) as Array<{
      Status?: string
      PostOffice?: Array<{ Name?: string; District?: string; State?: string; Block?: string }>
    }>
    const entry = Array.isArray(data) ? data[0] : null
    const offices = entry?.PostOffice ?? []
    if (entry?.Status !== 'Success' || offices.length === 0) {
      return NextResponse.json({ found: false })
    }

    const first = offices[0]
    return NextResponse.json({
      found: true,
      // India Post's "District" is the closest thing to the delivery city.
      city: first.District ?? null,
      state: first.State ?? null,
      area: first.Name ?? null,
      // Distinct post-office names, in case the admin wants a more specific area.
      areas: [...new Set(offices.map((o) => o.Name).filter(Boolean))].slice(0, 20),
    })
  } catch {
    // Network/timeout — let the admin fill the fields in by hand.
    return NextResponse.json({ found: false }, { status: 200 })
  }
}
