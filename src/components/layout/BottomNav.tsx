'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Truck, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'

const TABS = [
  { key: 'bottomnav.home' as const, href: '/', icon: Home },
  { key: 'bottomnav.search' as const, href: '/search', icon: Search },
  { key: 'bottomnav.orders' as const, href: '/orders', icon: Truck },
  { key: 'bottomnav.profile' as const, href: '/profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.totalItems())
  const { t } = useT()

  return (
    <nav className="md:hidden fixed bottom-5 inset-x-4 z-50">
      <div className="flex items-center justify-around h-16 px-2 bg-surface/85 backdrop-blur-2xl border border-white/40 rounded-full shadow-[0_12px_32px_rgba(38,23,12,0.15)] ring-1 ring-black/5">
        {TABS.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || (href === '/' && pathname === '/')
          const isOrders = href === '/orders'

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-full transition-all duration-300 active:scale-95 ${
                active
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {/* Animated active pill background */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                {isOrders && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-success text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow-sm shadow-success/40">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{t(key)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

