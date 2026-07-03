import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import FaqClient from './FaqClient'
import type { ProductFAQ } from '@/types/database.types'

export const metadata: Metadata = { title: 'FAQ | BCR Admin' }
export const revalidate = 0

export default async function FaqPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [productRes, categoryRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('products')
      .select('id, name, category_id')
      .eq('id', id)
      .maybeSingle(),
    // Fetch FAQs — graceful if table missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('product_faqs')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true }),
  ])

  if (!productRes.data) notFound()

  const product = productRes.data as { id: string; name: string; category_id: string | null }
  const faqRes = categoryRes

  // Resolve category name for smart FAQ templates
  let categoryName = ''
  if (product.category_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cat } = await (supabase as any)
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .maybeSingle()
    categoryName = (cat as { name?: string } | null)?.name ?? ''
  }

  const tableExists = !faqRes.error || faqRes.error?.code !== '42P01'
  const faqs = tableExists ? ((faqRes.data ?? []) as ProductFAQ[]) : []

  return (
    <FaqClient
      productId={id}
      productName={product.name}
      categoryName={categoryName}
      initialFaqs={faqs}
      tableExists={tableExists}
    />
  )
}
