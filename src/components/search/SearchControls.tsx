'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { Category } from '@/types/database.types'

interface Props {
  categories: Category[]
  initialQ: string
  initialCategory: string
}

export default function SearchControls({ categories, initialQ, initialCategory }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = initialQ
  }, [initialQ])

  const push = useCallback(
    (q: string, cat: string) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (cat) params.set('category', cat)
      startTransition(() => {
        router.push(`/search?${params.toString()}`, { scroll: false })
      })
    },
    [router]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      push(e.target.value, searchParams.get('category') ?? '')
    },
    [push, searchParams]
  )

  const clearQ = () => {
    if (inputRef.current) inputRef.current.value = ''
    push('', searchParams.get('category') ?? '')
    inputRef.current?.focus()
  }

  const selectCat = (slug: string) => {
    push(searchParams.get('q') ?? '', slug === initialCategory ? '' : slug)
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          defaultValue={initialQ}
          onChange={handleInput}
          placeholder="Search products, brands…"
          className="w-full pl-10 pr-10 py-3 bg-surface-card border border-table-border rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors shadow-sm"
        />
        {initialQ && (
          <button
            onClick={clearQ}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => selectCat('')}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              !initialCategory
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary hover:text-primary'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => selectCat(cat.slug)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                initialCategory === cat.slug
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
