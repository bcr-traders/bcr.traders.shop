import { auth } from '@/lib/auth/server'
import { aiJSON, isAIConfigured } from '@/lib/ai/openrouter'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/ai/translate — translate a map of English fields into Odia.
 * Body: { fields: { name: "Atta", description: "<p>…</p>", … } }
 * →     { translations: { name: "ଅଟା", description: "<p>…</p>", … } }
 * HTML tags, numbers, prices, units and brand names are preserved.
 */
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 })
  }

  const { fields } = await req.json() as { fields?: Record<string, unknown> }
  const entries = Object.entries(fields ?? {}).filter(
    ([, v]) => typeof v === 'string' && (v as string).trim(),
  ) as [string, string][]
  if (entries.length === 0) return NextResponse.json({ translations: {} })

  const system =
    'You are a professional English→Odia (ଓଡ଼ିଆ) translator for an Indian wholesale grocery e-commerce site. Translate naturally and accurately into Odia script. Keep any HTML tags, attributes, numbers, prices, units (kg, L, g) and brand names EXACTLY as-is — translate only the human-readable text. Reply with strict JSON only.'

  const user =
    `Translate the value of each field from English to Odia. Return ONLY a JSON object with the SAME keys and the Odia translation as each value:\n${JSON.stringify(Object.fromEntries(entries))}`

  try {
    const translations = await aiJSON<Record<string, string>>({
      system, user, maxTokens: 1800, temperature: 0.3,
    })
    return NextResponse.json({ translations })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Translation failed' }, { status: 502 })
  }
}
