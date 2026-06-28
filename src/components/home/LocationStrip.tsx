'use client'

import Link from 'next/link'
import { MapPin, ChevronDown, Search } from 'lucide-react'
import { useT } from '@/hooks/useT'

export default function LocationStrip() {
  const { t } = useT()

  return (
    <div className="px-4 pt-3 flex flex-col gap-3">
      {/* Delivery location */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <MapPin size={16} className="text-outline flex-shrink-0" />
        <span>
          Delivering to:{' '}
          <span className="font-bold text-primary">Cuttack Godown - 753001</span>
        </span>
        <ChevronDown size={16} className="ml-auto text-outline flex-shrink-0" />
      </div>

      {/* Inline search bar */}
      <Link
        href="/search"
        className="flex items-center gap-3 px-4 py-3 bg-surface-card border border-table-border rounded-xl text-on-surface-variant text-sm hover:border-outline transition-colors shadow-sm"
      >
        <Search size={16} className="text-outline flex-shrink-0" />
        <span>{t('nav.searchPlaceholder')}</span>
      </Link>
    </div>
  )
}
