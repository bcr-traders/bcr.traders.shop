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
    <footer className="mt-24 relative overflow-hidden bg-primary text-white border-t-2 border-primary">
      <div className="relative z-10 px-6 md:px-12 py-16 md:py-24 max-w-[1400px] mx-auto flex flex-col md:flex-row gap-16 md:justify-between">
        {/* Brand & Info */}
        <div className="flex flex-col">
          <ul className="flex flex-col gap-6 text-sm font-black uppercase tracking-widest text-white/70">
            <li className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
              <MapPin size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="max-w-[200px] leading-relaxed">
                Malgodown, Cuttack<br />Odisha 753003
              </span>
            </li>
            <li className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
              <Phone size={24} strokeWidth={2.5} className="group-hover:-rotate-12 transition-transform duration-300" />
              <span>+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
              <Mail size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
              <span>wholesale@bcrtraders.in</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="flex flex-col md:items-end">
          <h5 className="font-black text-white/50 text-[10px] uppercase tracking-[0.2em] mb-6">
            Directory
          </h5>
          <ul className="flex flex-col gap-2">
            {LINKS.map(({ label, href }) => (
              <li key={href} className="flex justify-start md:justify-end overflow-hidden">
                <Link
                  href={href}
                  className="group flex items-center gap-3 text-2xl md:text-4xl font-black text-white hover:text-white/80 transition-colors uppercase tracking-tighter"
                >
                  <ArrowRight size={24} strokeWidth={3} className="opacity-0 -ml-8 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 ease-out" />
                  <span className="relative">
                    {label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[3px] bg-white group-hover:w-full transition-all duration-300 rounded-none" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Massive Typography Logo */}
      <div className="w-full border-t border-white/20 pt-8 pb-32 md:pb-8 flex flex-col items-center justify-center overflow-hidden">
        <Link href="/" className="inline-block group hover:scale-[1.02] transition-transform duration-700">
          <h4 className="font-black tracking-tighter text-white text-[5rem] sm:text-[8rem] md:text-[12rem] lg:text-[16rem] leading-[0.75] lowercase px-4 text-center">
            bcr traders.
          </h4>
        </Link>
        <div className="mt-8 flex flex-col md:flex-row items-center gap-4 text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">
          <span>© 2025 BCR Traders</span>
          <span className="hidden md:inline">·</span>
          <span>Wholesale Distributor</span>
          <span className="hidden md:inline">·</span>
          <span>Odisha</span>
        </div>
      </div>
    </footer>
  )
}

