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
        className={cn('relative h-9', className)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {cartItem ? (
            // Stepper
            <motion.div
              key="stepper"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-between rounded-[var(--radius-btn)] bg-success-subtle border border-success/30 px-1"
            >
              <button
                onClick={(e) => handleChange(e, -1)}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-success shadow-sm hover:bg-success hover:text-on-success transition-colors active:scale-90"
                aria-label="Remove one"
              >
                <Minus size={13} />
              </button>
              <span className="text-[14px] font-bold text-success min-w-6 text-center">
                {cartItem.quantity}
              </span>
              <button
                onClick={(e) => handleChange(e, 1)}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-success text-on-success shadow-sm hover:opacity-90 transition-opacity active:scale-90"
                aria-label="Add one more"
              >
                <Plus size={13} />
              </button>
            </motion.div>
          ) : (
            // ADD button
            <motion.button
              key="add"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              onClick={handleAdd}
              disabled={disabled}
              className={cn(
                'absolute inset-0 flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] font-bold text-[13px] transition-all duration-300 active:scale-95 group/btn overflow-hidden',
                disabled
                  ? 'bg-surface-container text-on-surface-variant cursor-not-allowed border border-table-border/60'
                  : flash
                  ? 'bg-success text-on-success shadow-[0_0_15px_rgba(34,197,94,0.5)] border border-success'
                  : 'bg-gradient-to-br from-surface-container-low to-surface-card text-primary hover:from-primary hover:to-primary-container hover:text-white shadow-3xs hover:shadow-[0_4px_12px_rgba(38,23,12,0.15)] border border-table-border/80 hover:border-primary/50',
              )}
              aria-label={t('product.addToCart')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
              <Plus size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:rotate-90" />
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
