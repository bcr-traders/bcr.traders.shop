'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'

interface Props {
  code: string | null
  credit: number
  benefit: string
}

/**
 * Account-section referral card: shows the customer's own code (copy + share),
 * the program benefit, and any reward credit waiting to auto-apply at checkout.
 */
export default function ReferralCard({ code, credit, benefit }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }

  const share = async () => {
    if (!code) return
    const text = `Use my BCR Traders referral code ${code} on your first order to get a discount! ${benefit}.`
    try {
      if (navigator.share) await navigator.share({ title: 'BCR Traders Referral', text })
      else await navigator.clipboard.writeText(text)
    } catch { /* cancelled */ }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-primary bg-primary p-5 text-white">
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={16} className="text-white/80" />
          <h3 className="font-black text-sm uppercase tracking-widest">Refer &amp; Earn</h3>
        </div>
        <p className="text-xs font-medium text-white/60 mb-4">{benefit} · Share your code with friends.</p>

        {code ? (
          <>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 min-w-0 rounded-xl bg-white/10 border-2 border-white/20 px-4 py-3 flex items-center">
                <span className="font-black text-lg tracking-[0.2em] truncate">{code}</span>
              </div>
              <button onClick={copy} className="shrink-0 w-12 rounded-xl bg-white text-primary flex items-center justify-center hover:bg-white/90 transition-colors active:scale-95" aria-label="Copy code">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <button onClick={share} className="shrink-0 w-12 rounded-xl bg-white/15 border-2 border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95" aria-label="Share code">
                <Share2 size={18} />
              </button>
            </div>
            {credit > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Reward</span>
                <span className="text-sm font-bold text-white/90">₹{credit.toLocaleString('en-IN')} will auto-apply at your next checkout.</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-white/80 rounded-xl bg-white/10 border border-white/15 px-4 py-3">
            Place your first order to unlock your personal referral code.
          </p>
        )}
      </div>
    </section>
  )
}
