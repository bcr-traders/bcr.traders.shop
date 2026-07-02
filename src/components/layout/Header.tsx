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
      setScrolled(window.scrollY > 5)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="sticky top-0 z-50 w-full">
      <header
        className={`w-full transition-all duration-500 backdrop-blur-3xl bg-gradient-to-r from-surface/90 via-surface/80 to-surface/90 border-b border-white/20 ${
          scrolled ? 'shadow-[0_4px_30px_rgba(38,23,12,0.05)] py-2' : 'shadow-3xs py-3.5'
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300">
          
          {/* ── Ultra Premium Logo ── */}
          <Link href="/" className="flex items-center gap-3.5 group flex-shrink-0 relative">
            <div className="absolute -inset-3 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-secondary flex items-center justify-center shadow-lg group-hover:shadow-[0_8px_20px_rgba(38,23,12,0.25)] group-hover:-translate-y-0.5 group-active:scale-95 transition-all duration-300 z-10 ring-1 ring-white/20">
              <Zap size={20} className="text-on-primary fill-on-primary/20" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col justify-center relative z-10">
              <span className="text-sm sm:text-base font-black tracking-tight text-primary leading-none group-hover:tracking-normal transition-all duration-500">
                BCR TRADERS
              </span>
              <span className="text-[9px] font-bold text-secondary/70 tracking-widest uppercase mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> 
                Wholesale · Odisha
              </span>
            </div>
          </Link>

          {/* ── Animated Search Bar (Desktop) ── */}
          <Link
            href="/search"
            className="group hidden lg:flex flex-1 max-w-md mx-8 items-center gap-3 px-5 py-2.5 bg-surface-container-low/40 hover:bg-surface border border-table-border/60 hover:border-primary/40 rounded-2xl text-on-surface-variant text-sm transition-all duration-300 shadow-3xs hover:shadow-[0_4px_20px_rgba(38,23,12,0.08)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            <Search size={16} className="flex-shrink-0 text-primary/50 group-hover:text-primary transition-colors duration-300 relative z-10" />
            <span className="font-medium text-on-surface-variant/70 group-hover:text-primary transition-colors duration-300 relative z-10">
              {t('nav.searchPlaceholder')}
            </span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-table-border/80 bg-surface px-2 font-mono text-[10px] font-bold text-secondary/60 shadow-3xs relative z-10 group-hover:border-primary/30 group-hover:text-primary/80 transition-colors">
              <span>⌘</span>K
            </kbd>
          </Link>

          {/* ── Glowing Navigation Links (Desktop) ── */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 mr-4 lg:mr-6">
            {NAV.map(({ key, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 text-[11px] font-black tracking-widest uppercase transition-all duration-300 group py-2 ${
                    active ? 'text-primary' : 'text-on-surface-variant/70 hover:text-primary'
                  }`}
                >
                  <Icon 
                    size={14} 
                    className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} 
                    strokeWidth={active ? 2.5 : 2} 
                  />
                  {t(key)}
                  
                  {active && (
                    <motion.div
                      layoutId="desktop-nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-primary rounded-t-full shadow-[0_0_12px_rgba(38,23,12,0.6)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-primary/0 group-hover:bg-primary/30 rounded-t-full transition-colors duration-300" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* ── Right Action Items (Desktop) ── */}
          <div className="hidden md:flex items-center gap-4 relative z-10">
            <LanguageToggle />
            <CartBadge count={totalItems} />
            {isLoaded && isSignedIn && (
              <div className="border border-table-border/60 p-0.5 rounded-full shadow-3xs hover:scale-105 transition-transform duration-300 bg-surface-container-low/50">
                <UserButton />
              </div>
            )}
            {isLoaded && !isSignedIn && (
              <SignInButton mode="redirect">
                <button className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white text-xs font-bold rounded-xl active:scale-95 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 group">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                  <span className="relative z-10">{t('nav.signIn')}</span>
                </button>
              </SignInButton>
            )}
          </div>

          {/* ── Mobile Right Controls & Toggle ── */}
          <div className="flex md:hidden items-center gap-3 relative z-10">
            <Link
              href="/search"
              aria-label="Search"
              className="w-10 h-10 flex items-center justify-center rounded-2xl border border-table-border/60 hover:bg-surface-card active:scale-90 transition-all duration-200 text-primary bg-surface-container-low/40 shadow-3xs"
            >
              <Search size={18} />
            </Link>
            <CartBadge count={totalItems} />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl border border-table-border/60 hover:bg-surface-card active:scale-90 transition-all duration-200 text-primary bg-surface-container-low/40 shadow-3xs ml-1"
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
                    <X size={20} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={20} strokeWidth={2.5} />
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
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-t border-white/20 bg-surface/95 backdrop-blur-3xl absolute top-full left-0 w-full shadow-2xl"
            >
              <div className="px-6 py-6 flex flex-col gap-3">
                {NAV.map(({ key, href, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`px-5 py-4 rounded-2xl text-sm transition-all duration-300 flex items-center gap-4 ${
                        active
                          ? 'bg-gradient-to-r from-primary-fixed to-primary-fixed-dim text-on-primary-fixed-variant font-black shadow-md shadow-primary-fixed/20'
                          : 'text-on-surface-variant font-bold hover:bg-surface-container-low hover:text-primary'
                      }`}
                    >
                      <Icon size={18} className={active ? 'text-on-primary-fixed-variant' : 'text-primary/70'} />
                      <span className="flex-1">{t(key)}</span>
                      {active && <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(38,23,12,0.5)]" />}
                    </Link>
                  )
                })}
                
                <div className="my-2 h-px bg-table-border/40" />
                
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Language</span>
                  <LanguageToggle />
                </div>

                <div className="my-2 h-px bg-table-border/40" />

                {isLoaded && isSignedIn && (
                  <div className="flex items-center gap-4 px-5 py-4 border border-table-border/60 rounded-2xl bg-surface-container-low/70 shadow-3xs">
                    <UserButton />
                    <span className="text-sm font-black text-primary tracking-wide">My Account</span>
                  </div>
                )}
                {isLoaded && !isSignedIn && (
                  <SignInButton mode="redirect">
                    <button
                      className="w-full py-4 bg-gradient-to-r from-primary to-primary-container hover:to-primary text-white text-sm font-black rounded-2xl active:scale-95 transition-all duration-300 shadow-lg mt-2 relative overflow-hidden group"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      <span className="relative z-10">{t('nav.signIn')}</span>
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
