'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { UserButton, SignInButton, useAuth } from '@clerk/nextjs'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'
import LanguageToggle from './LanguageToggle'

const NAV = [
  { key: 'nav.home' as const, href: '/' },
  { key: 'nav.categories' as const, href: '/search' },
  { key: 'nav.orders' as const, href: '/orders' },
]

function CartBadge({ count }: { count: number }) {
  return (
    <Link href="/cart" className="relative" aria-label="Cart">
      <ShoppingCart size={22} className="text-primary" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-status-packed text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

export default function Header() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()
  const { t } = useT()

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-table-border">
      {/* ── Mobile ── */}
      <div className="md:hidden h-16 flex items-center justify-between px-4">
        {/* Left: hamburger + brand */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-3 active:scale-95 duration-150"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <X size={22} className="text-primary" />
          ) : (
            <Menu size={22} className="text-primary" />
          )}
          <span className="text-xl font-bold text-primary tracking-tight">BCR Traders</span>
        </button>

        {/* Right: search + cart + lang */}
        <div className="flex items-center gap-4">
          <Link href="/search" aria-label="Search" className="active:scale-95 duration-150">
            <Search size={22} className="text-primary" />
          </Link>
          <CartBadge count={totalItems} />
          <LanguageToggle />
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden md:flex h-16 items-center gap-5 px-6 max-w-7xl mx-auto">
        <Link href="/" className="font-bold text-xl text-primary tracking-tight flex-shrink-0">
          BCR Traders
        </Link>

        <Link
          href="/search"
          className="flex-1 max-w-md flex items-center gap-2 px-4 py-2.5 bg-surface-container-low border border-table-border rounded-xl text-on-surface-variant text-sm hover:border-outline transition-colors"
        >
          <Search size={15} className="flex-shrink-0" />
          <span>{t('nav.searchPlaceholder')}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ key, href }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <LanguageToggle />
          <CartBadge count={totalItems} />
          {isLoaded && isSignedIn && <UserButton />}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="redirect">
              <button className="px-4 py-1.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                {t('nav.signIn')}
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-table-border bg-surface px-4 py-3 flex flex-col gap-1 shadow-lg">
          {NAV.map(({ key, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {t(key)}
            </Link>
          ))}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="redirect">
              <button
                className="mt-2 w-full py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.signIn')}
              </button>
            </SignInButton>
          )}
        </div>
      )}
    </header>
  )
}
