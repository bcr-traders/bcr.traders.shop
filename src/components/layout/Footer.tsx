import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/database.types'

const USEFUL_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Categories', href: '/search' },
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
  { label: 'Cart', href: '/cart' },
]

async function getFooterCategories(): Promise<Pick<Category, 'id' | 'name' | 'slug'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('display_order')
  return data ?? []
}

export default async function Footer() {
  const categories = await getFooterCategories()

  return (
    <footer className="mt-24 relative overflow-hidden bg-primary text-white border-t-2 border-primary">
      <div className="relative z-10 px-6 md:px-12 py-16 md:py-20 max-w-[1400px] mx-auto flex flex-col gap-14">
        <div className="flex flex-col lg:flex-row gap-14 lg:gap-20">
          {/* Brand & Info */}
          <div className="flex flex-col flex-shrink-0">
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

          {/* Useful Links */}
          <div className="flex flex-col flex-shrink-0">
            <h5 className="font-black text-white text-sm uppercase tracking-wide mb-5">
              Useful Links
            </h5>
            <ul className="flex flex-col gap-3">
              {USEFUL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories — synced live from the admin panel */}
          {categories.length > 0 && (
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <h5 className="font-black text-white text-sm uppercase tracking-wide">
                  Categories
                </h5>
                <Link
                  href="/search"
                  className="text-sm font-bold text-success hover:text-success/80 transition-colors"
                >
                  see all
                </Link>
              </div>
              <div className="columns-2 sm:columns-3 gap-x-8">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="block break-inside-avoid text-sm font-medium text-white/60 hover:text-white transition-colors py-1.5"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
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

