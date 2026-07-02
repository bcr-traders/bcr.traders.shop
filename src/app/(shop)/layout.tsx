import { createClient } from '@/lib/supabase/server'
import AnnouncementBar from '@/components/home/AnnouncementBar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import type { SiteAnnouncement } from '@/types/database.types'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const cmsRes = await supabase
    .from('cms_content')
    .select('value')
    .eq('key', 'site_announcement')
    .maybeSingle()

  const rawAnn = (cmsRes.data as { value?: Record<string, unknown> } | null)?.value ?? null
  const announcement: SiteAnnouncement | null =
    rawAnn?.is_active === true && typeof rawAnn?.text === 'string'
      ? {
          text: rawAnn.text as string,
          background_color: (rawAnn.background_color as string) ?? '#3d2b1f',
          text_color: (rawAnn.text_color as string) ?? '#ffffff',
          link_url: rawAnn.link_url as string | undefined,
        }
      : null

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-0">
        {announcement && <AnnouncementBar data={announcement} />}
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  )
}
