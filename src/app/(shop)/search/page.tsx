import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import SearchControls from '@/components/search/SearchControls'
import type { Product, Category } from '@/types/database.types'
import { PackageSearch } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search Products — BCR TRADERS',
  description: 'Search wholesale oil, pulses, atta, spices, sugar and water at best prices.',
}

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; featured?: string }>
}

async function getSearchData(q: string, category: string, featured: boolean) {
  const supabase = await createClient()
  const db = supabase as any

  let productQuery = db
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
    .limit(60)

  if (q) {
    productQuery = productQuery.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,short_desc.ilike.%${q}%`
    )
  }

  if (category) {
    const { data: cat } = await db
      .from('categories')
      .select('id')
      .eq('slug', category)
      .eq('is_active', true)
      .maybeSingle()
    if (cat?.id) productQuery = productQuery.eq('category_id', cat.id)
  }

  if (featured) {
    productQuery = productQuery.eq('is_featured', true)
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    productQuery,
    db.from('categories').select('*').eq('is_active', true).order('display_order'),
  ])

  return {
    products: (products ?? []) as Product[],
    categories: (categories ?? []) as Category[],
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', category = '', featured } = await searchParams
  const isFeatured = featured === 'true'

  const { products, categories } = await getSearchData(q, category, isFeatured)

  const heading = q
    ? `Results for "${q}"`
    : category
    ? (categories.find((c) => c.slug === category)?.name ?? 'Products')
    : isFeatured
    ? 'Best Sellers'
    : 'All Products'

  return (
    <div className="flex flex-col gap-5 py-4 px-4">
      {/* Search input + category chips */}
      <Suspense>
        <SearchControls
          categories={categories}
          initialQ={q}
          initialCategory={category}
        />
      </Suspense>

      {/* Result header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-primary">{heading}</h1>
        <span className="text-xs text-on-surface-variant">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      {/* Results grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} className="w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
            <PackageSearch size={28} className="text-on-surface-variant" />
          </div>
          <div>
            <p className="font-semibold text-on-surface">No products found</p>
            <p className="text-sm text-on-surface-variant mt-1">
              {q ? `Try a different search term or browse categories below.` : 'No products available in this category yet.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
