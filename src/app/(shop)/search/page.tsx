import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import SearchControls from '@/components/search/SearchControls'
import type { Product, Category } from '@/types/database.types'
import { PackageSearch, Sparkles, TrendingUp } from 'lucide-react'

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

  const activeCategoryName = category
    ? (categories.find((c) => c.slug === category)?.name ?? 'Products')
    : null

  const heading = q
    ? `Results for "${q}"`
    : activeCategoryName
    ? activeCategoryName
    : isFeatured
    ? 'Best Sellers'
    : 'All Products'

  const isFiltered = !!q || !!category || isFeatured

  return (
    <div className="min-h-screen">
      {/* ── Page hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        {/* Dot texture */}
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-7xl mx-auto py-8 md:py-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            {isFeatured ? (
              <TrendingUp size={14} className="text-white/50" strokeWidth={2.5} />
            ) : (
              <Sparkles size={14} className="text-white/50" strokeWidth={2.5} />
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {isFeatured ? 'Curated Selection' : isFiltered ? 'Filtered Results' : 'Full Catalog'}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {heading}
          </h1>
          <p className="text-sm text-white/50 font-medium mt-0.5">
            {products.length} {products.length === 1 ? 'product' : 'products'} available
          </p>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="px-4 max-w-7xl mx-auto mb-6">
        <Suspense>
          <SearchControls
            categories={categories}
            initialQ={q}
            initialCategory={category}
          />
        </Suspense>
      </div>

      {/* ── Results ── */}
      <div className="px-4 max-w-7xl mx-auto pb-10">
        {products.length > 0 ? (
          <>
            {/* Count bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50">
                {products.length} {products.length === 1 ? 'Product' : 'Products'}
              </span>
              <div className="h-px flex-1 bg-table-border" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} className="w-full" />
              ))}
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            {/* Icon in a styled container */}
            <div className="relative">
              <div className="w-20 h-20 border-2 border-table-border bg-surface-card flex items-center justify-center rounded-3xl shadow-sm">
                <PackageSearch size={32} className="text-on-surface-variant/40" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-black">0</span>
              </div>
            </div>

            <div className="max-w-xs">
              <p className="font-black text-primary text-lg uppercase tracking-tight">
                No products found
              </p>
              <p className="text-sm text-on-surface-variant/70 font-medium mt-1.5 leading-relaxed">
                {q
                  ? `No results for "${q}". Try a different term or browse all categories.`
                  : 'No products available in this category yet.'}
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full max-w-xs mt-2">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">or</span>
              <div className="h-px flex-1 bg-table-border" />
            </div>

            {/* Browse all CTA */}
            <a
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all duration-200 active:scale-95 shadow-sm"
            >
              Browse All Products
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
