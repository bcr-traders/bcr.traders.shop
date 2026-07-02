import Link from 'next/link'
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Categories', href: '/search' },
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
  { label: 'Cart', href: '/cart' },
]

export default function Footer() {
  return (
    <footer className="mt-16 relative overflow-hidden bg-surface-container-high border-t border-table-border/50 text-center md:text-left z-10">
      {/* ── Ambient Background Gradients ── */}
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60">
        <div className="absolute -top-[50%] -left-[10%] w-[60%] h-[150%] bg-gradient-to-r from-primary/15 to-secondary/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[50%] -right-[10%] w-[60%] h-[150%] bg-gradient-to-l from-primary/10 to-primary-container/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 px-6 py-16 max-w-7xl mx-auto flex flex-col md:flex-row md:gap-16 lg:gap-24 md:items-start">
        {/* Brand & Info */}
        <div className="mb-12 md:mb-0 md:flex-[1.5] lg:flex-1">
          <Link href="/" className="inline-block group">
            <h4 className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/60 text-3xl md:text-4xl mb-3 drop-shadow-sm group-hover:to-primary transition-all duration-300">
              BCR Traders
            </h4>
          </Link>
          <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto md:mx-0">
            {process.env.NEXT_PUBLIC_APP_TAGLINE ??
              "Odisha's trusted wholesale distributor for commodities."}
          </p>
          <ul className="mt-8 flex flex-col gap-5 text-[13px] text-on-surface-variant items-center md:items-start font-medium">
            <li className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 group-hover:shadow-md group-hover:border-primary/30 transition-all duration-500">
                <MapPin size={16} className="text-primary flex-shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </div>
              <span className="text-on-surface-variant/80 group-hover:text-primary transition-colors duration-300 max-w-[200px] text-left leading-snug">
                Malgodown, Cuttack, Odisha 753003
              </span>
            </li>
            <li className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 group-hover:shadow-md group-hover:border-primary/30 transition-all duration-500">
                <Phone size={16} className="text-primary flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="text-on-surface-variant/80 group-hover:text-primary transition-colors duration-300 font-bold tracking-wide">
                +91 98765 43210
              </span>
            </li>
            <li className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 group-hover:shadow-md group-hover:border-primary/30 transition-all duration-500">
                <Mail size={16} className="text-primary flex-shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </div>
              <span className="text-on-surface-variant/80 group-hover:text-primary transition-colors duration-300">
                wholesale@bcrtraders.in
              </span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="md:flex-1 pb-16 md:pb-0"> {/* padding bottom for mobile floating nav */}
          <h5 className="font-black text-primary text-xs uppercase tracking-widest mb-6 flex items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(38,23,12,0.4)]" />
            Quick Links
          </h5>
          <ul className="flex flex-col flex-wrap justify-center md:justify-start gap-4">
            {LINKS.map(({ label, href }) => (
              <li key={href} className="flex items-center justify-center md:justify-start overflow-hidden">
                <Link
                  href={href}
                  className="group flex items-center gap-2.5 text-[13px] font-bold text-on-surface-variant/70 hover:text-primary transition-all duration-300"
                >
                  <ArrowRight size={14} className="text-primary opacity-0 -ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  <span className="relative">
                    {label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary group-hover:w-full transition-all duration-300 rounded-full" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative z-10 border-t border-table-border/40 text-center pb-24 pt-8 md:pb-8 md:pt-8 bg-gradient-to-b from-surface-container/50 to-surface-container backdrop-blur-sm">
        <p className="text-[10px] font-black tracking-widest text-secondary/60 uppercase">
          © 2025 BCR Traders · Wholesale Distributor · Odisha
        </p>
      </div>
    </footer>
  )
}

