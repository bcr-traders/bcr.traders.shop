import { createClient } from '@/lib/supabase/server'
import AnnouncementBar from '@/components/home/AnnouncementBar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import SmoothScroll from '@/components/layout/SmoothScroll'
import type { SiteAnnouncement } from '@/types/database.types'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const [cmsRes, catRes] = await Promise.all([
    supabase
      .from('cms_content')
      .select('value')
      .eq('key', 'site_announcement')
      .maybeSingle(),
    supabase
      .from('categories')
      .select('name')
      .eq('is_active', true)
      .order('display_order')
      .limit(8),
  ])

  const searchTerms = ((catRes.data as { name: string }[] | null) ?? [])
    .map((c) => c.name)
    .filter(Boolean)

  const rawAnn = (cmsRes.data as { value?: Record<string, unknown> } | null)?.value ?? null
  const announcement: SiteAnnouncement | null =
    rawAnn?.is_active === true && typeof rawAnn?.text === 'string'
      ? {
          text: rawAnn.text as string,
          background_color: (rawAnn.background_color as string) ?? '#000000',
          text_color: (rawAnn.text_color as string) ?? '#ffffff',
          link_url: rawAnn.link_url as string | undefined,
        }
      : null

  return (
    <SmoothScroll>
      <Header searchTerms={searchTerms} />
      <main className="min-h-screen pb-20 md:pb-0 selection:bg-black selection:text-white">
        {announcement && <AnnouncementBar data={announcement} />}
        {children}
      </main>
      <Footer />
      <BottomNav />
    </SmoothScroll>
  )
}
