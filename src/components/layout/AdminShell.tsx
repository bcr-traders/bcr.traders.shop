'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import AdminSidebar from './AdminSidebar'

export interface AdminBadges {
  orders: number
  unserviceable: number
}

interface Props {
  role: 'super_admin' | 'admin'
  children: React.ReactNode
  badges?: AdminBadges
}

const BOTTOM_NAV = [
  { href: '/admin/dashboard',  label: 'Home',    icon: 'dashboard' },
  { href: '/admin/orders',     label: 'Orders',  icon: 'receipt_long' },
  { href: '/admin/products',   label: 'Products',icon: 'inventory_2' },
  { href: '/admin/analytics',  label: 'Reports', icon: 'bar_chart' },
  { href: '/admin/profiles',   label: 'Team',    icon: 'group' },
]

export default function AdminShell({ role, children, badges }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop sidebar (sticky, part of flex flow) ── */}
      <AdminSidebar
        role={role}
        badges={badges}
        className="hidden lg:flex sticky top-0 self-start flex-shrink-0"
      />

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <AdminSidebar role={role} badges={badges} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-surface-bright border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-primary">menu</span>
            </button>
            <span className="font-headline-md text-headline-md text-primary font-bold">BCR Traders</span>
          </div>
          <button className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-margin-desktop h-16 bg-surface-bright border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-primary font-bold">BCR Traders</h2>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content — add bottom padding on mobile for the bottom nav */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 px-2 bg-surface-container-highest shadow-[0px_-4px_20px_rgba(61,43,31,0.10)]">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-all',
                  active
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:text-primary active:scale-90 transition-transform',
                )}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="font-label-sm text-label-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

      </div>
    </div>
  )
}
