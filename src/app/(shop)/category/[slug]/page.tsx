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

      {/* ── Category Banner ─────────────────────────────────────────────────── */}
      <section className="relative w-full h-[180px] md:h-[300px] bg-primary-container overflow-hidden">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary to-tertiary-container" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category name */}
        <div className="absolute bottom-0 left-0 right-0 px-4 lg:px-16 pb-5 md:pb-8">
          <p className="font-label-sm text-label-sm text-primary-fixed-dim mb-1 uppercase tracking-widest">
            Category
          </p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-white leading-tight">
            {category.name}
          </h1>
          {category.name_or && (
            <p className="font-odia text-base text-white/70 mt-0.5">{category.name_or}</p>
          )}
        </div>
      </section>

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mt-4">
        <ProductBreadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: category.name, labelOr: category.name_or ?? undefined },
          ]}
        />
      </div>

      {/* ── Sort / Filter / Grid (Client) ───────────────────────────────────── */}
      <CategoryProductsSection
        categoryId={category.id}
        initialProducts={products}
        initialTotal={total}
      />

      {/* ── SEO description ─────────────────────────────────────────────────── */}
      <section className="bg-surface-container-low border-t border-outline-variant mt-4">
        <div className="max-w-7xl mx-auto px-4 lg:px-0 py-10">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
            About {category.name}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl leading-relaxed">
            Discover our curated selection of <strong>{category.name}</strong> products at BCR
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
