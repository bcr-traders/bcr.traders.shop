import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserProfile } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile — BCR Traders',
  robots: { index: false },
}

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-4xl mx-auto py-7 md:py-9">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft size={12} strokeWidth={2.5} /> Back to Shop
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            My Profile
          </h1>
          <p className="text-xs text-white/45 font-medium mt-0.5">
            Manage your account settings and addresses
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12 flex justify-center">
        <div className="w-full max-w-3xl [&_.cl-rootBox]:w-full [&_.cl-card]:w-full">
          <UserProfile
            appearance={{

              variables: {
                colorPrimary: '#2c1810',
                colorBackground: '#fffcf7',
                borderRadius: '0.875rem',
                fontFamily: 'Manrope, ui-sans-serif, sans-serif',
                fontSize: '14px',
              },
              elements: {
                card: 'shadow-none border-2 border-table-border bg-surface-card',
                navbar: 'bg-surface-container-low border-r border-table-border',
                navbarButton: 'font-bold text-on-surface hover:bg-black/5 hover:text-primary transition-colors',
                headerTitle: 'font-black text-primary tracking-tight',
                headerSubtitle: 'text-on-surface-variant font-medium',
                formButtonPrimary:
                  'bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-200 shadow-sm active:scale-95 px-6 py-3',
                formButtonReset:
                  'border-2 border-table-border text-on-surface font-black text-xs uppercase tracking-widest rounded-xl hover:border-primary/40 hover:text-primary transition-all duration-200 px-6 py-3',
                formFieldInput:
                  'border-2 border-table-border focus:border-primary rounded-xl font-medium text-on-surface bg-surface-card transition-colors duration-200 py-2.5',
                formFieldLabel:
                  'font-black text-xs uppercase tracking-wider text-primary mb-1.5',
                dividerLine: 'bg-table-border',
                dividerText: 'text-on-surface-variant font-bold text-[10px] uppercase tracking-widest',
                badge: 'bg-primary/10 text-primary font-bold border border-primary/20',
                profileSectionTitle: 'font-black text-primary text-base border-b border-table-border pb-2 mb-4',
                profileSectionTitleText: 'font-black uppercase tracking-wide',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
