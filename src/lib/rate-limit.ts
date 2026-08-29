type RateLimitOk = { ok: true; remaining: number; reset: number }
type RateLimitDenied = { ok: false; remaining: 0; reset: number; retryAfterSec: number }
export type RateLimitResult = RateLimitOk | RateLimitDenied

const memoryStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Sanitize an Upstash env value. A value pasted WITH surrounding quotes or stray
 * whitespace (e.g. `"https://x.upstash.io"`) would otherwise be baked straight
 * into the request URL — `"https://x.upstash.io"/pipeline` — making every fetch
 * throw `Invalid URL`, which silently disabled rate limiting in production.
 * Stripping quotes/whitespace makes a future paste mistake degrade gracefully.
 */
function cleanEnv(v: string | undefined): string | undefined {
  if (!v) return v
  const cleaned = v.trim().replace(/^["']+|["']+$/g, '').trim()
  return cleaned || undefined
}

// URL also loses any trailing slash so `${UPSTASH_URL}/pipeline` can't become `//pipeline`.
const UPSTASH_URL = cleanEnv(process.env.UPSTASH_REDIS_REST_URL)?.replace(/\/+$/, '')
const UPSTASH_TOKEN = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN)

async function upstashIncr(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number } | null> {
  // Not configured (e.g. local dev) → fall back to memory quietly. This is the
  // ONLY quiet path; a configured-but-failing Upstash is loud below.
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
        ['TTL', key],
      ]),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(
        `[rate-limit] CRITICAL: Upstash responded HTTP ${res.status} — rate limiting has degraded to per-instance memory (weak on serverless). Investigate immediately.`,
      )
      return null
    }
    const data = (await res.json()) as Array<{ result: number | string }>
    const count = Number(data?.[0]?.result ?? 0)
    const ttl = Number(data?.[2]?.result ?? ttlSeconds)
    return { count, ttl: ttl > 0 ? ttl : ttlSeconds }
  } catch (err) {
    // DELIBERATE fail-open: on an Upstash outage we fall back to the in-memory
    // store rather than blocking every OTP/login request. Failing CLOSED here
    // would lock out ALL users during a transient Redis hiccup — a worse
    // incident than briefly weaker rate limiting. The fallback is per-instance
    // (weak on serverless), so this is logged as CRITICAL: a recurring line
    // means rate limiting is effectively off and needs immediate attention.
    console.error(
      '[rate-limit] CRITICAL: Upstash call failed — rate limiting has degraded to per-instance memory (weak on serverless). Investigate immediately.',
      err,
    )
    return null
  }
}

function memoryIncr(key: string, ttlSeconds: number) {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + ttlSeconds * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { count: 1, ttl: ttlSeconds }
  }
  existing.count += 1
  memoryStore.set(key, existing)
  return { count: existing.count, ttl: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
}

export async function rateLimit(opts: { key: string; limit: number; windowSec: number }): Promise<RateLimitResult> {
  const fullKey = `rl:${opts.key}:${opts.windowSec}`
  const result = (await upstashIncr(fullKey, opts.windowSec)) ?? memoryIncr(fullKey, opts.windowSec)
  const reset = Math.floor(Date.now() / 1000) + result.ttl
  if (result.count > opts.limit) {
    return { ok: false, remaining: 0, reset, retryAfterSec: result.ttl }
  }
  return { ok: true, remaining: Math.max(0, opts.limit - result.count), reset }
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '0.0.0.0'
}

export function rateLimitResponse(result: RateLimitDenied) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again later.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(result.retryAfterSec) } },
  )
}
