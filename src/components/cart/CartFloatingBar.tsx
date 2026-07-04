'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'

/**
 * Blinkit-style floating "View Cart" bar. Appears whenever the cart has items,
 * except on the cart / checkout pages. Sits above the mobile bottom nav.
 */
export default function CartFloatingBar() {
  const items = useCartStore((s) => s.items)
  const totalItems = useCartStore((s) => s.totalItems())
  const totalPrice = useCartStore((s) => s.totalPrice())
  const pathname = usePathname()

  const hidden =
    items.length === 0 ||
    pathname === '/cart' ||
    pathname.startsWith('/checkout')

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed z-40 left-3 right-3 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-80"
        >
          <Link
            href="/cart"
            className="flex items-center justify-between gap-3 bg-[#0c831f] text-white rounded-2xl pl-3 pr-4 py-2.5 shadow-[0_8px_24px_rgba(12,131,31,0.35)] hover:bg-[#0a7019] active:scale-[0.98] transition-all duration-200"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={18} strokeWidth={2.5} />
              </span>
              <span className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-bold text-white/80">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
                <span className="text-[15px] font-black">₹{totalPrice}</span>
              </span>
            </span>
            <span className="flex items-center gap-0.5 font-black text-sm uppercase tracking-wide flex-shrink-0">
              View Cart
              <ChevronRight size={18} strokeWidth={2.5} />
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
