import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Zap, Package, Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign In — BCR TRADERS',
  description: 'Sign in to your BCR Traders wholesale account to manage orders and track deliveries.',
}

const PERKS = [
  { icon: Package, label: 'Bulk Wholesale', sub: 'Best prices on large orders' },
  { icon: Truck, label: 'Fast Dispatch', sub: 'Next-day delivery across Odisha' },
  { icon: ShieldCheck, label: 'Secure Orders', sub: 'COD & online payment accepted' },
  { icon: Zap, label: '500+ Retailers', sub: 'Trusted by businesses statewide' },
]

export default function LoginPage() {
  return (
    <main className="min-h-screen flex bg-background selection:bg-primary selection:text-white">

      {/* ── LEFT — Branded panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col relative overflow-hidden bg-primary">

        {/* Fine dot texture */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        {/* Decorative orbs */}
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Top logo bar */}
        <div className="relative z-10 p-10 pb-0">
          <Link href="/" className="inline-block group">
            <span className="text-3xl font-black tracking-tighter text-white lowercase group-hover:opacity-80 transition-opacity duration-300">
              bcr traders.
            </span>
          </Link>
        </div>

        {/* Main copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-14">
          <div className="mb-8">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/15 px-3 py-1.5 rounded-full mb-6">
              Wholesale Platform
            </span>
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.08] mb-4">
              Odisha&apos;s Most
              <br />
              Trusted Wholesale
              <br />
              <span className="text-white/50">Distributor.</span>
            </h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed max-w-sm">
              Sign in to access your wholesale account, track bulk orders, and manage your business deliveries — all in one place.
            </p>
          </div>

          {/* Perk list */}
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {PERKS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors duration-300"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={16} className="text-white/70" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[12px] font-black text-white uppercase tracking-wide leading-none">{label}</p>
                  <p className="text-[11px] text-white/40 font-medium mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10 px-10 py-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            © 2025 BCR Traders · Malgodown, Cuttack, Odisha
          </p>
        </div>
      </div>

      {/* ── RIGHT — Sign-in form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 relative">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-black tracking-tighter text-primary lowercase">
              bcr traders.
            </span>
          </Link>
          <p className="text-xs text-on-surface-variant font-medium mt-1 tracking-wide">
            Wholesale · Odisha
          </p>
        </div>

        {/* Sign-in heading (desktop) */}
        <div className="hidden lg:block w-full max-w-sm mb-6">
          <h2 className="text-2xl font-black tracking-tight text-primary">
            Welcome back
          </h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Sign in to your wholesale account
          </p>
        </div>

        {/* Clerk SignIn widget — themed to match */}
        <SignIn
          appearance={{

            variables: {
              colorPrimary: '#2c1810',
              colorBackground: '#fffcf7',
              borderRadius: '0.875rem',
              fontFamily: 'Manrope, ui-sans-serif, sans-serif',
              fontSize: '14px',
            },
            elements: {
              card: 'shadow-[0_8px_40px_rgba(44,24,16,0.10)] border border-table-border/60 bg-surface-card',
              headerTitle: 'font-black text-primary tracking-tight',
              headerSubtitle: 'text-on-surface-variant',
              formButtonPrimary:
                'bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95',
              formFieldInput:
                'border-2 border-table-border focus:border-primary rounded-xl font-medium text-on-surface bg-surface-card transition-colors duration-200',
              formFieldLabel: 'font-black text-[11px] uppercase tracking-wider text-primary',
              footerActionLink: 'text-primary font-black hover:underline',
              identityPreviewEditButton: 'text-primary',
              dividerLine: 'bg-table-border',
              dividerText: 'text-on-surface-variant text-xs font-bold uppercase tracking-wider',
              socialButtonsBlockButton:
                'border-2 border-table-border hover:border-primary/40 bg-surface-card hover:bg-surface-container-low font-bold rounded-xl transition-all duration-200 text-on-surface',
              socialButtonsBlockButtonText: 'font-bold text-on-surface',
              otpCodeFieldInput: 'border-2 border-table-border focus:border-primary rounded-xl font-black',
              alertText: 'text-on-surface-variant text-xs',
              internal_card: 'rounded-2xl',
            },
          }}
        />

        {/* Back to home link */}
        <div className="mt-6">
          <Link
            href="/"
            className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors duration-200"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}