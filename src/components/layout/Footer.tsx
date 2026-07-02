import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Categories', href: '/search' },
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
  { label: 'Cart', href: '/cart' },
]

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-table-border/60 bg-surface-container-low text-center md:text-left">
      <div className="px-4 py-12 max-w-7xl mx-auto md:flex md:gap-16 md:items-start">
        {/* Brand */}
        <div className="mb-10 md:mb-0 md:flex-1">
          <h4 className="font-black tracking-tight text-primary text-2xl mb-3">BCR Traders</h4>
          <p className="text-xs md:text-sm font-medium text-on-surface-variant/80 leading-relaxed max-w-sm mx-auto md:mx-0">
            {process.env.NEXT_PUBLIC_APP_TAGLINE ??
              "Odisha's trusted wholesale distributor for commodities."}
          </p>
          <ul className="mt-6 flex flex-col gap-3.5 text-xs text-on-surface-variant items-center md:items-start font-medium">
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin size={14} className="text-primary flex-shrink-0" />
              </div>
              <span className="text-on-surface-variant">Malgodown, Cuttack, Odisha 753003</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone size={14} className="text-primary flex-shrink-0" />
              </div>
              <span className="text-on-surface-variant">+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail size={14} className="text-primary flex-shrink-0" />
              </div>
              <span className="text-on-surface-variant">wholesale@bcrtraders.in</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="mb-10 md:mb-0 pb-16 md:pb-0"> {/* padding bottom for mobile floating nav */}
          <h5 className="font-black text-primary text-xs uppercase tracking-widest mb-4">Quick Links</h5>
          <ul className="flex flex-col md:flex-row flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs font-bold text-on-surface-variant/80 hover:text-primary underline underline-offset-4 decoration-transparent hover:decoration-primary/30 transition-all duration-200"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-table-border/50 text-center pb-24 pt-6 md:pb-6 md:pt-6 bg-surface-container">
        <p className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">
          © 2025 BCR Traders · Wholesale Distributor · Odisha
        </p>
      </div>
    </footer>
  )
}

