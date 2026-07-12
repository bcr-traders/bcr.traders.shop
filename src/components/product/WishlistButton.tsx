'use client'

import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { cn } from '@/lib/utils'

/** Heart toggle for saving a product to the customer's wishlist. */
export default function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const ids = useWishlistStore((s) => s.ids)
  const toggle = useWishlistStore((s) => s.toggle)
  const hydrate = useWishlistStore((s) => s.hydrate)
  const { isSignedIn, isLoaded } = useSupabaseUser()
  const showAuthPrompt = useAuthPromptStore((s) => s.show)

  const active = ids.includes(productId)

  useEffect(() => {
    if (isSignedIn) hydrate()
  }, [isSignedIn, hydrate])

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isLoaded && !isSignedIn) { showAuthPrompt(); return }
        toggle(productId)
      }}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center bg-white/85 backdrop-blur-sm shadow-sm hover:bg-white active:scale-90 transition',
        className,
      )}
    >
      <Heart size={16} className={cn('transition-colors', active ? 'fill-error text-error' : 'text-on-surface-variant/70')} />
    </button>
  )
}
