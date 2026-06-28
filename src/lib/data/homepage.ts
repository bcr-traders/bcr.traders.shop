import { createClient } from '@/lib/supabase/server'
import type {
  Banner,
  Category,
  Product,
  Coupon,
  SiteAnnouncement,
  OfferBannerConfig,
} from '@/types/database.types'

export interface HomepageData {
  banners: Banner[]
  categories: Category[]
  featuredProducts: Product[]
  coupons: Coupon[]
  categoryProducts: Record<string, Product[]>
  announcement: SiteAnnouncement | null
  offerBanner: OfferBannerConfig | null
}

function parseCmsValue<T>(
  value: unknown,
  validate: (v: Record<string, unknown>) => boolean
): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  return validate(v) ? (v as unknown as T) : null
}

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient()

  const [bannersRes, categoriesRes, featuredRes, couponsRes, cmsRes] =
    await Promise.all([
      supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('display_order')
        .limit(12),
      supabase.from('coupons').select('*').eq('is_active', true),
      supabase.from('cms_content').select('*'),
    ])

  const banners = bannersRes.data ?? []
  const categories = categoriesRes.data ?? []
  const featuredProducts = featuredRes.data ?? []
  const coupons = couponsRes.data ?? []

  const cmsMap: Record<string, unknown> = {}
  ;(cmsRes.data ?? []).forEach((row) => {
    cmsMap[row.key] = row.value
  })

  // Per-category products (parallel)
  const categoryProducts: Record<string, Product[]> = {}
  if (categories.length > 0) {
    const perCatResults = await Promise.all(
      categories.map((cat) =>
        supabase
          .from('products')
          .select('*')
          .eq('category_id', cat.id)
          .eq('is_active', true)
          .order('display_order')
          .limit(8)
      )
    )
    categories.forEach((cat, i) => {
      categoryProducts[cat.id] = perCatResults[i].data ?? []
    })
  }

  const announcement = parseCmsValue<SiteAnnouncement>(
    cmsMap['site_announcement'],
    (v) => typeof v['text'] === 'string' && v['is_active'] === true
  )

  const offerBanner = parseCmsValue<OfferBannerConfig>(
    cmsMap['offer_banner'],
    (v) => typeof v['image_url'] === 'string'
  )

  return {
    banners,
    categories,
    featuredProducts,
    coupons,
    categoryProducts,
    announcement,
    offerBanner,
  }
}
