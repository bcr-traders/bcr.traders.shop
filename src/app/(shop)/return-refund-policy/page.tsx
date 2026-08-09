import type { Metadata } from 'next'
import { Ban, PackageX, ClipboardCheck, Phone, Mail, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Return & Refund Policy | BCR Traders',
  description:
    'BCR Traders Return & Refund Policy — all sales are final. No returns or refunds are accepted once an order is placed.',
}

export default function ReturnRefundPolicyPage() {
  return (
    <div className="min-h-screen">
      {/* ── Page hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-4xl mx-auto py-9 md:py-12">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">
            Policies
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            Return &amp; Refund Policy
          </h1>
          <p className="text-xs text-white/45 font-medium mt-1.5">
            Please read this carefully before placing an order
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14 space-y-6">
        {/* Headline statement */}
        <section className="bg-surface-card rounded-2xl border-2 border-error/25 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-error/10 border-2 border-error/20 flex items-center justify-center">
              <Ban size={24} strokeWidth={2.5} className="text-error" />
            </span>
            <div>
              <h2 className="font-black text-lg md:text-xl text-primary tracking-tight">
                All sales are final
              </h2>
              <p className="mt-2 text-sm md:text-base font-medium text-on-surface-variant leading-relaxed">
                <strong className="font-black text-primary">No returns and no refunds will be accepted</strong>{' '}
                once an order is placed. By placing an order with BCR Traders, you agree to this policy.
              </p>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="bg-surface-card rounded-2xl border-2 border-table-border p-6 md:p-8 space-y-8">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center">
              <PackageX size={22} strokeWidth={2.5} className="text-primary" />
            </span>
            <div>
              <h3 className="font-black text-base text-primary uppercase tracking-wide">No Returns</h3>
              <p className="mt-1.5 text-sm font-medium text-on-surface-variant leading-relaxed">
                As a wholesale distributor of food and household commodities, we do not accept returns of
                any products once an order has been placed and dispatched. This applies to all items,
                across every category.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center">
              <Ban size={22} strokeWidth={2.5} className="text-primary" />
            </span>
            <div>
              <h3 className="font-black text-base text-primary uppercase tracking-wide">No Refunds</h3>
              <p className="mt-1.5 text-sm font-medium text-on-surface-variant leading-relaxed">
                Payments made for orders — whether Cash on Delivery or online (prepaid) — are
                non-refundable. Once an order is confirmed, the amount paid will not be returned.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center">
              <ClipboardCheck size={22} strokeWidth={2.5} className="text-primary" />
            </span>
            <div>
              <h3 className="font-black text-base text-primary uppercase tracking-wide">
                Check your order before you buy
              </h3>
              <p className="mt-1.5 text-sm font-medium text-on-surface-variant leading-relaxed">
                Because all sales are final, please review your cart, quantities, and delivery details
                carefully before placing an order. If you have any questions about a product, contact us
                first — we&rsquo;re happy to help you order the right items.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-primary rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          <div className="relative z-10">
            <h3 className="font-black text-base text-white uppercase tracking-wide">Questions?</h3>
            <p className="mt-1.5 text-sm font-medium text-white/60 leading-relaxed">
              For any queries about your order, please reach out — our team will assist you.
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm font-bold text-white/80">
              <a href="tel:+919897933955" className="flex items-center gap-3 hover:text-white transition-colors w-fit">
                <Phone size={18} strokeWidth={2.5} className="flex-shrink-0" />
                +91 98979 33955
              </a>
              <a href="mailto:bcr.traders19@gmail.com" className="flex items-center gap-3 hover:text-white transition-colors w-fit normal-case">
                <Mail size={18} strokeWidth={2.5} className="flex-shrink-0" />
                bcr.traders19@gmail.com
              </a>
              <span className="flex items-center gap-3">
                <MapPin size={18} strokeWidth={2.5} className="flex-shrink-0" />
                Brahmapur, Ganjam, Odisha 760001
              </span>
            </div>
          </div>
        </section>

        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/50 text-center pt-2">
          BCR Traders · Wholesale Distributor · Odisha
        </p>
      </div>
    </div>
  )
}
