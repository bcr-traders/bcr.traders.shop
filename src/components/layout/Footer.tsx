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
    <footer className="px-4 py-10 mt-6 border-t border-table-border bg-surface text-center md:text-left">
      <div className="max-w-7xl mx-auto md:flex md:gap-16 md:items-start">
        {/* Brand */}
        <div className="mb-8 md:mb-0 md:flex-1">
          <h4 className="font-bold text-primary text-xl mb-2">BCR Traders</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {process.env.NEXT_PUBLIC_APP_TAGLINE ??
              "Odisha's trusted wholesale distributor for commodities."}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-on-surface-variant items-center md:items-start">
            <li className="flex items-center gap-2">
              <MapPin size={14} className="text-outline flex-shrink-0" />
              <span>Malgodown, Cuttack, Odisha 753003</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-outline flex-shrink-0" />
              <span>+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-outline flex-shrink-0" />
              <span>wholesale@bcrtraders.in</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="mb-8 md:mb-0">
          <h5 className="font-semibold text-primary text-sm mb-3 hidden md:block">Quick Links</h5>
          <ul className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-table-border text-center">
        <p className="text-xs text-outline">
          © 2025 BCR Traders · Wholesale Distributor · Odisha
        </p>
      </div>
    </footer>
  )
}
