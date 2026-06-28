'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Truck, User } from 'lucide-react'
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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-table-border rounded-t-2xl shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || (href === '/' && pathname === '/')
          const isOrders = href === '/orders'

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-150 active:scale-90 ${
                active
                  ? 'bg-primary-fixed text-on-primary-fixed-variant'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {isOrders && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-status-packed text-primary text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t(key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
