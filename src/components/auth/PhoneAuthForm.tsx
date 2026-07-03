'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ChevronLeft, ShieldCheck } from 'lucide-react'

type Portal = 'customer' | 'admin' | 'delivery'

interface Props {
  portal: Portal
  allowSignup: boolean
  title: string
  subtitle: string
}

export default function PhoneAuthForm({ portal, allowSignup, title, subtitle }: Props) {
  const searchParams = useSearchParams()
  const modeParam = searchParams.get('mode')

  const [mode, setMode] = useState<'login' | 'signup'>(allowSignup && modeParam === 'signup' ? 'signup' : 'login')
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [notRegistered, setNotRegistered] = useState(false)

  const digits = phone.replace(/\D/g, '')

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotRegistered(false)

    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    setLoading(true)
    try {
      const formattedPhone = `+91${digits}`

      const pre = await fetch('/api/auth/otp/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, mode, portal }),
      })
      const preData = await pre.json().catch(() => ({}))

      if (!pre.ok) {
        if (preData?.error_code === 'user_not_found') {
          setNotRegistered(true)
          setLoading(false)
          return
        }
        setError(preData.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      const otpRes = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })
      const otpData = await otpRes.json().catch(() => ({}))

      if (!otpRes.ok || !otpData.verificationId) {
        const detail = otpData.hint || otpData.reason
        const base = otpData.error || 'Failed to send OTP. Please try again.'
        setError(detail ? `${base} — ${detail}` : base)
        setLoading(false)
        return
      }

      setVerificationId(otpData.verificationId)
      setStep('otp')
      setMessage(`OTP sent to +91 ${digits}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (otp.length !== 4) {
      setError('Please enter the 4-digit OTP.')
      return
    }
    if (!verificationId) {
      setError('Session expired. Please request a new OTP.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+91${digits}`,
          otp,
          verificationId,
          mode,
          portal,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.error) {
        if (data?.error_code === 'user_not_found') {
          setNotRegistered(true)
          setLoading(false)
          return
        }
        const extra = data.detail || data.hint
        setError((data.error || 'OTP verification failed. Please try again.') + (extra ? ` — ${extra}` : ''))
        setLoading(false)
        return
      }

      setLoginUrl(data.loginUrl)

      if (data.needs_name) {
        setStep('name')
        setLoading(false)
        return
      }

      if (data.loginUrl) window.location.href = data.loginUrl
    } catch (err) {
      setError('Something went wrong: ' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
    }
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!loginUrl) {
      setError('Session expired — please request a new OTP.')
      return
    }
    try {
      sessionStorage.setItem('bcr_pending_profile', JSON.stringify({ name: name.trim(), email: email.trim(), ts: Date.now() }))
    } catch {}
    window.location.href = loginUrl
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-primary">{title}</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1.5">{subtitle}</p>
      </div>

      {step === 'phone' && (
        <form onSubmit={sendOtp} className="flex flex-col gap-4">
          {allowSignup && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low mb-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${mode === 'login' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${mode === 'signup' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary outline-none transition-colors"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Mobile Number</label>
            <div className="flex items-center mt-1.5 rounded-xl border-2 border-table-border focus-within:border-primary bg-surface-card transition-colors">
              <span className="pl-4 pr-2 py-3 font-bold text-primary">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={digits}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Your phone number"
                className="flex-1 py-3 pr-4 bg-transparent font-medium text-primary outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Send OTP
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors w-max"
          >
            <ChevronLeft size={14} /> Back
          </button>

          {message && (
            <p className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <ShieldCheck size={16} className="text-primary" /> {message}
            </p>
          )}

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Enter OTP</label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              autoFocus
              className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-black text-lg tracking-[0.4em] text-primary outline-none transition-colors text-center"
            />
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Verify &amp; Continue
          </button>

          <button
            type="button"
            onClick={sendOtp as unknown as () => void}
            disabled={loading}
            className="text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            Resend OTP
          </button>
        </form>
      )}

      {step === 'name' && (
        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
          <p className="text-sm font-medium text-on-surface-variant">One last thing — what should we call you?</p>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              className="w-full mt-1.5 px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary outline-none transition-colors"
            />
          </div>
          {error && <p className="text-sm font-medium text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            Continue
          </button>
        </form>
      )}

      {notRegistered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-xl w-full max-w-sm p-6 border-2 border-table-border">
            <h3 className="font-black text-lg text-primary">
              {portal === 'customer' ? 'No account found' : 'No staff account found'}
            </h3>
            <p className="text-sm text-on-surface-variant font-medium mt-2">
              {portal === 'customer'
                ? "We couldn't find an account for this number. Switch to Sign Up to create one."
                : 'Contact your administrator to get provisioned for this portal.'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setNotRegistered(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-table-border font-black text-xs uppercase tracking-widest text-on-surface-variant hover:border-primary/40 transition-colors"
              >
                Close
              </button>
              {allowSignup && (
                <button
                  onClick={() => { setNotRegistered(false); setMode('signup') }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
