import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Session keep-alive. Called periodically by <SessionKeepAlive/>.
 *
 * This is a Route Handler, so the server Supabase client CAN write cookies here.
 * Calling getUser() refreshes the access token when it's near expiry and persists
 * the rotated tokens back into the cookies — keeping the session alive for idle
 * tabs. The browser client no longer refreshes on its own (see lib/supabase/client),
 * so this server-side refresh is the single, drift-free source of rotation.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.json({ ok: !!user }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }
}
