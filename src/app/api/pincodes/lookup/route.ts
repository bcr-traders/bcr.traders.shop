import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

// BCR only serves Ganjam district, Odisha — every lookup is scoped to it.
const DISTRICT = 'ganjam'
const STATE = 'odisha'
const PIN_RE = /^\d{6}$/

interface Office {
  Name?: string
  District?: string
  Division?: string
  State?: string
  Pincode?: string
}

const inGanjam = (o: Office) =>
  (o.District ?? '').trim().toLowerCase() === DISTRICT &&
  (o.State ?? '').trim().toLowerCase() === STATE

// India Post's "Division" is the city (e.g. "Berhampur"); "District" is "Ganjam".
const cityOf = (o: Office) => o.Division || o.District || null

async function postal(path: string): Promise<Office[] | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://api.postalpincode.in/${path}`, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ Status?: string; PostOffice?: Office[] }>
    const entry = Array.isArray(data) ? data[0] : null
    if (entry?.Status !== 'Success') return []
    return entry.PostOffice ?? []
  } catch {
    return null
  }
}

/**
 * GET /api/pincodes/lookup
 *   ?pincode=760001 → { found, inArea, area, city, state }   (inArea=false when the
 *                       pincode exists but is outside Ganjam district)
 *   ?area=Berhampur → { found, options: [{ area, pincode, city, state }] }
 *
 * Both scoped to Ganjam district, Odisha, via India Post's free API. Admin-gated.
 */
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const pincode = (params.get('pincode') ?? '').trim()
  const area = (params.get('area') ?? '').trim()

  // ── Pincode → area / city / state ──
  if (pincode) {
    if (!PIN_RE.test(pincode)) return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 })
    const offices = await postal(`pincode/${pincode}`)
    if (!offices || offices.length === 0) return NextResponse.json({ found: false })
    const ganjam = offices.filter(inGanjam)
    if (ganjam.length === 0) return NextResponse.json({ found: true, inArea: false })
    const first = ganjam[0]
    return NextResponse.json({
      found: true,
      inArea: true,
      area: first.Name ?? null,
      city: cityOf(first),
      state: first.State ?? 'Odisha',
      areas: [...new Set(ganjam.map((o) => o.Name).filter(Boolean))].slice(0, 20),
    })
  }

  // ── Area name → pincode options ──
  if (area) {
    if (area.length < 3) return NextResponse.json({ found: false, options: [] })
    const offices = await postal(`postoffice/${encodeURIComponent(area)}`)
    if (!offices) return NextResponse.json({ found: false, options: [] })
    const seen = new Set<string>()
    const options: Array<{ area: string; pincode: string; city: string | null; state: string }> = []
    for (const o of offices.filter(inGanjam)) {
      const key = `${o.Name}|${o.Pincode}`
      if (seen.has(key) || !o.Pincode) continue
      seen.add(key)
      options.push({ area: o.Name ?? '', pincode: o.Pincode, city: cityOf(o), state: o.State ?? 'Odisha' })
    }
    return NextResponse.json({ found: options.length > 0, options: options.slice(0, 15) })
  }

  return NextResponse.json({ error: 'Provide a pincode or area' }, { status: 400 })
}
