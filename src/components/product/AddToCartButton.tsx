'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/database.types'

interface Props {
  product: Product
  className?: string
  /** "icon" — small circle ADD (default, for product detail etc.)
   *  "full" — full-width ADD button with text + stepper */
  variant?: 'icon' | 'full'
  disabled?: boolean
}

export default function AddToCartButton({ product, className, variant = 'icon', disabled }: Props) {
  const addItem       = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItem      = useCartStore((s) => s.items.find((i) => i.id === product.id))
  const [flash, setFlash] = useState(false)
  const { t } = useT()

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      unit: product.unit,
      image: product.images?.[0] ?? null,
      slug: product.slug,
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 800)
  }

  const handleChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!cartItem) return
    updateQuantity(cartItem.id, cartItem.quantity + delta)
  }

  // ── Full-width variant ─────────────────────────────────────────────────────
  if (variant === 'full') {
    return (
      <div
        className={cn('relative h-10', className)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {cartItem ? (
            // Stepper
            <motion.div
              key="stepper"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-between rounded-xl bg-primary text-white overflow-hidden"
            >
              <button
                onClick={(e) => handleChange(e, -1)}
                className="w-10 h-full flex items-center justify-center bg-transparent hover:bg-white/20 transition-colors active:scale-95"
                aria-label="Remove one"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="text-[14px] font-black min-w-6 text-center tracking-widest">
                {cartItem.quantity}
              </span>
              <button
                onClick={(e) => handleChange(e, 1)}
                className="w-10 h-full flex items-center justify-center bg-transparent hover:bg-white/20 transition-colors active:scale-95"
                aria-label="Add one more"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </motion.div>
          ) : (
            // ADD button
            <motion.button
              key="add"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={handleAdd}
              disabled={disabled}
              className={cn(
                'absolute inset-0 flex items-center justify-center gap-2 rounded-xl font-black text-xs md:text-[13px] transition-all duration-300 active:scale-95 group/btn uppercase tracking-widest',
                disabled
                  ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'
                  : flash
                  ? 'bg-success text-white'
                  : 'bg-primary text-white hover:bg-primary-container shadow-sm hover:shadow-md',
              )}
              aria-label={t('product.addToCart')}
            >
              <Plus size={16} strokeWidth={3} className="transition-transform duration-300 group-hover/btn:rotate-90" />
              ADD
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Icon variant (default — small circle, for product detail page) ──────────
  if (cartItem) {
    return (
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        className={cn('flex items-center justify-between bg-primary-fixed rounded-lg px-1 py-0.5 min-w-[96px]', className)}
      >
        <button
          onClick={(e) => handleChange(e, -1)}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-card shadow-sm text-primary hover:bg-primary-fixed-dim transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-bold text-primary min-w-6 text-center">
          {cartItem.quantity}
        </span>
        <button
          onClick={(e) => handleChange(e, 1)}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={disabled}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95',
        disabled
          ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
          : flash
          ? 'bg-primary-fixed text-primary'
          : 'bg-primary-container text-on-primary hover:bg-primary hover:text-on-primary',
        className,
      )}
      aria-label={t('product.addToCart')}
    >
      <Plus size={18} />
    </button>
  )
}
