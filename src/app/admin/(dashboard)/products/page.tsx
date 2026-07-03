import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = { title: 'Products | BCR Admin' }
export const revalidate = 0

export default async function ProductsPage() {
  const supabase = createAdminClient()

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <ProductsClient
      initialProducts={productsRes.data ?? []}
      categories={(categoriesRes.data ?? []) as { id: string; name: string }[]}
    />
  )
}
