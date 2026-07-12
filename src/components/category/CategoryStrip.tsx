'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database.types'

type StripCategory = Pick<Category, 'id' | 'name' | 'name_or' | 'slug' | 'image_url'>

/**
 * Blinkit-style horizontal category switcher: a scrollable row of circular
 * images with labels. The image is the admin-uploaded `image_url` (use
 * transparent-background PNGs so it reads as an icon); shown object-contain on a
 * light circle. The active category is highlighted.
 */
export default function CategoryStrip({
  categories,
  activeSlug,
}: {
  categories: StripCategory[]
  activeSlug?: string
}) {
  const { tField } = useT()
  if (!categories.length) return null

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {categories.map((cat) => {
          const active = cat.slug === activeSlug
          const name = tField(cat.name, cat.name_or)
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-2 flex-shrink-0 w-[68px] sm:w-[76px] group"
            >
              <div
                className={cn(
                  'w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-200 active:scale-95',
                  active
                    ? 'border-primary bg-primary/[0.06] shadow-[0_0_0_3px_rgba(28,19,10,0.07)]'
                    : 'border-table-border bg-surface-container group-hover:border-primary/40',
                )}
              >
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={name}
                    width={68}
                    height={68}
                    className="w-full h-full object-contain p-2.5"
                  />
                ) : (
                  <span className="text-xl font-black text-primary">{cat.name.charAt(0)}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] font-bold text-center leading-tight line-clamp-2 transition-colors',
                  active ? 'text-primary' : 'text-on-surface-variant/80 group-hover:text-primary',
                )}
              >
                {name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
