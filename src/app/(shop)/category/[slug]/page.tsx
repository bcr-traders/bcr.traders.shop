import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getCategoryBySlug, getCategoryProducts } from '@/lib/data/category'
import { getCategoryKeywords } from '@/lib/seo/generator'
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb'
import CategoryProductsSection from './CategoryProductsSection'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Category Not Found' }

  const title = `${category.name} Wholesale Odisha — BCR Traders`
  const description = `Buy ${category.name} in bulk at BCR Traders — best wholesale prices, cash on delivery, fast delivery across Odisha. Shop our full range of ${category.name.toLowerCase()} products.`
  const keywords = getCategoryKeywords(slug)
  const ogImage = category.image_url
    ? [{ url: category.image_url, width: 1200, height: 630, alt: category.name }]
    : [{ url: '/images/og-default.jpg', width: 1200, height: 630 }]

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title,
      description,
      url: `/category/${slug}`,
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: category.image_url ? [category.image_url] : ['/images/og-default.jpg'],
    },
  }
}

// ── Static params (build-time pre-rendering) ──────────────────────────────────

export async function generateStaticParams() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('categories')
      .select('slug')
      .eq('is_active', true)
    return ((data ?? []) as Array<{ slug: string }>).map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const { products, total } = await getCategoryProducts({
    categoryId: category.id,
    sort: 'featured',
    page: 1,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bcrtraders.com'

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${appUrl}/category/${slug}`,
      },
    ],
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Category Banner ── */}
      <section className="relative w-full h-[200px] md:h-[280px] bg-primary overflow-hidden">
        {/* Dot texture */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none z-10" />

        {/* Ambient orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-[70px] pointer-events-none z-10" />
        <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-white/4 rounded-full blur-[60px] pointer-events-none z-10" />

        {/* Background image */}
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-20 mix-blend-luminosity"
          />
        ) : null}

        {/* Rich gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60 z-10" />

        {/* Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end px-5 md:px-10 lg:px-16 pb-7 md:pb-10 max-w-7xl mx-auto">
          <span className="inline-block text-[9px] font-black uppercase tracking-[0.22em] text-white/40 border border-white/15 px-3 py-1.5 rounded-full w-max mb-3">
            Category
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.08]">
            {category.name}
          </h1>
          {category.name_or && (
            <p className="font-odia text-base text-white/50 mt-1.5">{category.name_or}</p>
          )}
        </div>
      </section>

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto mt-4 px-4 lg:px-0">
        <ProductBreadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: category.name, labelOr: category.name_or ?? undefined },
          ]}
        />
      </div>

      {/* ── Sort / Filter / Grid (Client) ── */}
      <CategoryProductsSection
        categoryId={category.id}
        initialProducts={products}
        initialTotal={total}
      />

      {/* ── SEO description ── */}
      <section className="mt-8 border-t-2 border-table-border bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-5 lg:px-0 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-table-border" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
              About
            </span>
            <div className="h-px flex-1 bg-table-border" />
          </div>
          <h2 className="text-xl font-black text-primary tracking-tight uppercase mb-3">
            {category.name}
          </h2>
          <p className="text-sm font-medium text-on-surface-variant/80 max-w-3xl leading-relaxed">
            Discover our curated selection of <strong className="text-primary font-black">{category.name}</strong> products at BCR
            Traders. We source only the finest quality {category.name.toLowerCase()} items directly
            from trusted suppliers, ensuring freshness and value with every order. Whether you&apos;re
            stocking your pantry or shopping for your business, our {category.name.toLowerCase()}{' '}
            collection is carefully picked to meet your everyday needs — at prices that make sense.
          </p>
        </div>
      </section>
    </>
  )
}
