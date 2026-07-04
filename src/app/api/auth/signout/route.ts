import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) await supabase.auth.signOut()

  // Redirect to the home page of whatever origin the user is actually on
  // (localhost / Vercel preview / production) — never a hardcoded domain.
  return NextResponse.redirect(new URL('/', request.nextUrl.origin), { status: 302 })
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request)
}

// GET is supported too so a plain `<a href="/api/auth/signout">` / full-page
// navigation works without needing a client-side fetch first.
export async function GET(request: NextRequest) {
  return signOutAndRedirect(request)
}
