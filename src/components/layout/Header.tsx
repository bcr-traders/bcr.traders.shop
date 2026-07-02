'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, Home, Grid, Truck, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserButton, SignInButton, useAuth } from '@clerk/nextjs'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'
import LanguageToggle from './LanguageToggle'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { key: 'nav.home' as const, href: '/', icon: Home },
  { key: 'nav.categories' as const, href: '/search', icon: Grid },
  { key: 'nav.orders' as const, href: '/orders', icon: Truck },
]

function CartBadge({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      className="relative w-10 h-10 flex items-center justify-center rounded-2xl border border-table-border/60 hover:border-primary/40 bg-surface-container-low/40 hover:bg-surface-card transition-all duration-300 group active:scale-95 shadow-3xs hover:shadow-md"
      aria-label="Cart"
    >
      <ShoppingCart size={18} className="text-primary group-hover:-translate-y-0.5 transition-transform duration-300" />
      <AnimatePresence mode="popLayout">
        {count > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            key={count}
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-gradient-to-br from-primary to-primary-container text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 leading-none shadow-md ring-2 ring-surface"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

export default function Header() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isSignedIn, isLoaded } = useAuth()
  const { t } = useT()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="sticky top-0 z-50 w-full bg-background">
      <header
        className={`w-full transition-all duration-500 bg-background ${
          scrolled ? 'py-4 border-b border-outline-variant/30' : 'py-6 md:py-8'
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* ── Brutalist Logo ── */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <span className="text-3xl md:text-4xl font-black tracking-tighter text-primary leading-none group-hover:tracking-tight transition-all duration-300 lowercase">
              bcr traders.
            </span>
          </Link>

          {/* ── Glowing Navigation Links (Desktop) ── */}
          <nav className="hidden lg:flex items-center gap-8 ml-auto mr-12">
            {NAV.map(({ key, href }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center text-[10px] md:text-[11px] font-black tracking-[0.15em] uppercase transition-all duration-300 group py-2 ${
                    active ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {t(key)}
                  
                  {active && (
                    <motion.div
                      layoutId="desktop-nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute -bottom-1 left-0 w-0 h-[3px] bg-primary group-hover:w-full transition-all duration-300 ease-out" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* ── Right Action Items (Desktop) ── */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/search"
              aria-label="Search"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-surface-variant text-primary transition-all duration-300 shadow-sm border border-outline-variant/40"
            >
              <Search size={16} strokeWidth={2.5} />
            </Link>
            
            <Link
              href="/cart"
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-surface-variant text-primary transition-all duration-300 shadow-sm border border-outline-variant/40"
              aria-label="Cart"
            >
              <ShoppingCart size={16} strokeWidth={2.5} />
              <AnimatePresence mode="popLayout">
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    key={totalItems}
                    className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {isLoaded && isSignedIn && (
              <div className="hover:scale-105 transition-transform duration-300 ml-2">
                <UserButton />
              </div>
            )}
            {isLoaded && !isSignedIn && (
              <SignInButton mode="redirect">
                <button className="px-6 py-3 bg-primary text-white text-[10px] uppercase tracking-[0.1em] font-black rounded-full active:scale-95 transition-transform duration-300 ml-2 hover:bg-primary/90">
                  {t('nav.signIn')}
                </button>
              </SignInButton>
            )}
          </div>

          {/* ── Mobile Right Controls & Toggle ── */}
          <div className="flex lg:hidden items-center gap-3">
            <Link
              href="/search"
              aria-label="Search"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-surface-variant text-primary transition-all duration-300 shadow-sm border border-outline-variant/40"
            >
              <Search size={16} strokeWidth={2.5} />
            </Link>
            <Link
              href="/cart"
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-surface-variant text-primary transition-all duration-300 shadow-sm border border-outline-variant/40"
            >
              <ShoppingCart size={16} strokeWidth={2.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white ml-2 active:scale-95 transition-transform"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={18} strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Mobile Full-Width Dropdown Drawer ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden overflow-hidden bg-background absolute top-full left-0 w-full border-b border-outline-variant/20 shadow-2xl"
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                {NAV.map(({ key, href }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl font-black uppercase tracking-tighter transition-all duration-300 flex items-center justify-between ${
                        active
                          ? 'text-primary'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span>{t(key)}</span>
                      {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </Link>
                  )
                })}
                
                <div className="my-2 h-px bg-outline-variant/20" />

                {isLoaded && isSignedIn && (
                  <div className="flex items-center gap-4 py-2">
                    <UserButton />
                    <span className="text-sm font-black text-primary tracking-wide uppercase">My Account</span>
                  </div>
                )}
                {isLoaded && !isSignedIn && (
                  <SignInButton mode="redirect">
                    <button
                      className="w-full py-4 bg-primary text-white text-sm font-black uppercase tracking-[0.1em] rounded-full active:scale-95 transition-transform mt-4"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t('nav.signIn')}
                    </button>
                  </SignInButton>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  )
}
