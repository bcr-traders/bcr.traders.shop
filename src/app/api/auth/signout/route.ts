import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) await supabase.auth.signOut()

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  return NextResponse.redirect(new URL('/', origin), { status: 302 })
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request)
}

// GET is supported too so a plain `<a href="/api/auth/signout">` / full-page
// navigation works without needing a client-side fetch first.
export async function GET(request: NextRequest) {
  return signOutAndRedirect(request)
}
