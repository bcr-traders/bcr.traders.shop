import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/message-central'
import { createAdminClient } from '@/lib/supabase/server'
import { consumeOtpBinding } from '@/lib/auth/otp-store'
import { findAuthUserIdByPhone } from '@/lib/auth/find-user'
import { upsertProfile } from '@/lib/auth/upsert-profile'
import { normalizeIndianPhone, isPersonName, isEmail, isSafeInternalPath } from '@/lib/validators'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import type { AuthMetadata } from '@/types'

type Portal = 'customer' | 'admin' | 'delivery'

const DEFAULT_NEXT: Record<Portal, string> = {
  customer: '/',
  admin: '/admin/dashboard',
  delivery: '/delivery/dashboard',
}

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { phone, otp, verificationId, name, email } = body || {}
    const portal: Portal = ['customer', 'admin', 'delivery'].includes(body?.portal) ? body.portal : 'customer'
    // Staff can never self-signup through this endpoint, regardless of what the client sends.
    const mode: 'login' | 'signup' = portal === 'customer' && body?.mode === 'signup' ? 'signup' : 'login'

    if (!verificationId || typeof verificationId !== 'string' || !otp || typeof otp !== 'string' || otp.length > 10) {
      return NextResponse.json({ error: 'OTP and verification ID are required.' }, { status: 400 })
    }

    const submittedDigits = normalizeIndianPhone(phone)
    if (!submittedDigits) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 })
    }

    const ip = getClientIp(request)
    const perId = await rateLimit({ key: `otp:verify:id:${verificationId}`, limit: 5, windowSec: 600 })
    if (!perId.ok) return rateLimitResponse(perId)
    const perIp = await rateLimit({ key: `otp:verify:ip:${ip}`, limit: 30, windowSec: 600 })
    if (!perIp.ok) return rateLimitResponse(perIp)

    // 1. Verify OTP with Message Central
    const mcResult = await verifyOtp(verificationId, otp)
    if (!mcResult.success) {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 })
    }

    // 2. Confirm the verificationId was issued for THIS phone (one-shot binding).
    const boundDigits = await consumeOtpBinding(verificationId).catch(() => null)
    if (boundDigits !== null && boundDigits !== submittedDigits) {
      return NextResponse.json({ error: 'OTP could not be verified for this number.' }, { status: 400 })
    }

    const cleanPhone = `+91${submittedDigits}`

    let safeName: string | undefined
    if (name !== undefined && name !== null && name !== '') {
      if (!isPersonName(name)) return NextResponse.json({ error: 'Invalid name.' }, { status: 400 })
      safeName = name.trim()
    }

    let safeEmail: string | null = null
    if (email !== undefined && email !== null && email !== '') {
      if (!isEmail(email)) return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
      safeEmail = email.trim().toLowerCase()
      if (/@bcrtraders\.internal$/i.test(safeEmail)) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
      }
    }

    const supabaseAdmin = createAdminClient()

    let userId: string
    let userEmail: string
    let needsName = false
    let appMetadata: AuthMetadata
    let profileWriteError: string | null = null

    if (portal === 'admin' || portal === 'delivery') {
      // ── Staff login — account must already exist (super_admin provisions it). ──
      const expectedRoles = portal === 'admin' ? ['admin', 'super_admin'] : ['delivery']
      const { data: staff } = await supabaseAdmin
        .from('admin_profiles')
        .select('id, role, user_id, is_active, name')
        .or(`phone.eq.${cleanPhone},phone.eq.${submittedDigits}`)
        .maybeSingle()

      if (!staff || !staff.is_active || !expectedRoles.includes(staff.role)) {
        return NextResponse.json(
          { error: 'No staff account found for this number. Contact your administrator.', error_code: 'user_not_found' },
          { status: 404 },
        )
      }

      if (staff.user_id) {
        userId = staff.user_id
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
        userEmail = authData?.user?.email || `${submittedDigits}@bcrtraders.internal`
      } else {
        const authEmail = `${submittedDigits}@bcrtraders.internal`
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: cleanPhone,
          email: authEmail,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { name: staff.name },
        })

        if (createError) {
          const orphan = /already.*regist|already.*exist|duplicate/i.test(createError.message || '')
          const recoveredId = orphan ? await findAuthUserIdByPhone(supabaseAdmin, submittedDigits) : null
          if (!recoveredId) throw createError
          userId = recoveredId
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
          userEmail = authData?.user?.email || authEmail
        } else {
          userId = newUser.user.id
          userEmail = newUser.user.email!
        }

        await supabaseAdmin.from('admin_profiles').update({ user_id: userId }).eq('id', staff.id)
      }

      appMetadata = { role: staff.role as AuthMetadata['role'], supabase_profile_id: userId, admin_profile_id: staff.id }
    } else if (mode === 'login') {
      // ── Customer login ──
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .or(`phone.eq.${cleanPhone},phone.eq.${submittedDigits}`)
        .maybeSingle()

      if (!profile) {
        const { data: staffMatch } = await supabaseAdmin
          .from('admin_profiles')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.${submittedDigits}`)
          .maybeSingle()

        if (staffMatch) {
          return NextResponse.json(
            { error: 'This number is registered as staff. Please use the staff login.', error_code: 'wrong_portal' },
            { status: 400 },
          )
        }

        return NextResponse.json(
          { error: 'No account found for this number. Please create an account first.', error_code: 'user_not_found' },
          { status: 404 },
        )
      }

      userId = profile.id
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
      userEmail = authData?.user?.email || `${submittedDigits}@bcrtraders.internal`
      appMetadata = { role: 'customer', supabase_profile_id: userId }
    } else {
      // ── Customer signup ──
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .or(`phone.eq.${cleanPhone},phone.eq.${submittedDigits}`)
        .maybeSingle()

      if (existingProfile) {
        userId = existingProfile.id
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
        userEmail = authData?.user?.email || `${submittedDigits}@bcrtraders.internal`

        if (!existingProfile.name && safeName) {
          await supabaseAdmin.from('profiles').update({ name: safeName, ...(safeEmail && { email: safeEmail }) }).eq('id', userId)
        }
        needsName = !existingProfile.name && !safeName
      } else {
        const authEmail = safeEmail ?? `${submittedDigits}@bcrtraders.internal`
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: cleanPhone,
          email: authEmail,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: safeName ? { name: safeName } : {},
        })

        if (createError) {
          const orphan = /already.*regist|already.*exist|duplicate/i.test(createError.message || '')
          const recoveredId = orphan ? await findAuthUserIdByPhone(supabaseAdmin, submittedDigits) : null
          if (!recoveredId) throw createError
          userId = recoveredId
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
          userEmail = authData?.user?.email || authEmail
        } else {
          userId = newUser.user.id
          userEmail = newUser.user.email!
        }

        profileWriteError = await upsertProfile(supabaseAdmin, {
          id: userId,
          phone: cleanPhone,
          email: safeEmail,
          ...(safeName && { name: safeName }),
        })
        needsName = !safeName
      }

      appMetadata = { role: 'customer', supabase_profile_id: userId }
    }

    await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMetadata }).catch((err) => {
      console.error('[OTP Verify] app_metadata update failed:', err)
    })

    // 5. Generate magic link with a validated redirect target
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const siteUrl = host.includes('localhost') ? `http://${host}` : `${protocol}://${host}`

    const requestedNext = typeof body?.next === 'string' ? body.next : DEFAULT_NEXT[portal]
    const safeNext = isSafeInternalPath(requestedNext) ? requestedNext : DEFAULT_NEXT[portal]
    const redirectTo = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(safeNext)}`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo },
    })

    if (linkError) {
      console.error('[OTP Verify] generateLink failed:', linkError.message, '| redirectTo:', redirectTo, '| email:', userEmail)
      return NextResponse.json({
        error: 'Could not create your login session.',
        detail: linkError.message,
        hint: `Check Supabase → Authentication → URL Configuration: Site URL / Redirect URLs must include ${siteUrl}/api/auth/callback.`,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      loginUrl: linkData.properties.action_link,
      needs_name: mode === 'signup' ? needsName : false,
      user_id: userId,
      role: appMetadata.role,
      ...(profileWriteError && { profile_warning: profileWriteError }),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[OTP Verify] Error:', detail)
    const alreadyExists = /already.*regist|already.*exist|duplicate/i.test(detail)
    return NextResponse.json({
      error: alreadyExists ? 'This number is already registered. Please switch to Login.' : 'Verification failed.',
      detail,
    }, { status: 500 })
  }
}
